const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import services
const StripeService = require('../services/stripeService');
const OrderService = require('../services/orderService');
const { logger } = require('../utils/logger');

// POST /api/stripe/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', [
  body('orderData').isObject().withMessage('Order data is required'),
  body('orderData.customer').isObject().withMessage('Customer data is required'),
  body('orderData.items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('orderData.customer.email').isEmail().withMessage('Valid email is required'),
  body('orderData.customer.firstname').notEmpty().withMessage('First name is required'),
  body('orderData.customer.lastname').notEmpty().withMessage('Last name is required'),
  body('orderData.customer.address').notEmpty().withMessage('Address is required'),
  body('orderData.customer.zipcode').notEmpty().withMessage('ZIP code is required'),
  body('orderData.customer.city').notEmpty().withMessage('City is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { orderData } = req.body;

    // Create order in database first
    const order = await OrderService.createOrder(orderData);

    // Create Stripe checkout session
    const session = await StripeService.createCheckoutSession(order);

    logger.info('Checkout session created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      sessionId: session.id
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        orderId: order.id,
        orderNumber: order.orderNumber
      }
    });

  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Zahlungssession'
    });
  }
});

// POST /api/stripe/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let event;

    if (process.env.STRIPE_SECRET_KEY) {
      // Verify webhook signature in production
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        logger.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }
    } else {
      // For development without Stripe keys
      event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_simulated_' + Date.now(),
            payment_intent: 'pi_simulated_' + Date.now(),
            metadata: {
              order_id: 'order_simulated',
              order_number: 'SUN' + Date.now().toString().slice(-6)
            }
          }
        }
      };
    }

    // Process the webhook
    const result = await StripeService.handleWebhook(event);

    logger.info('Webhook processed successfully', {
      eventType: event.type,
      result
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Webhook-Verarbeitung'
    });
  }
});

// GET /api/stripe/session/:sessionId - Get session status
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await StripeService.retrieveSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        orderId: session.metadata?.order_id,
        orderNumber: session.metadata?.order_number
      }
    });

  } catch (error) {
    logger.error('Error retrieving session:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Session'
    });
  }
});

module.exports = router;
