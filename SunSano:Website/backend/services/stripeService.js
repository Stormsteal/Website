const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { logger } = require('../utils/logger');
const database = require('../database');
const emailService = require('./emailService');

class StripeService {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn('STRIPE_SECRET_KEY not set - payments will be simulated');
    }
  }

  async createCheckoutSession(orderData) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        // Simulate Stripe session for development
        return {
          id: 'cs_simulated_' + Date.now(),
          url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/payment-success?session_id=cs_simulated_${Date.now()}`,
          payment_intent: 'pi_simulated_' + Date.now()
        };
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'sepa_debit'],
        line_items: orderData.items.map(item => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name,
              description: item.description || '',
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/payment-cancelled`,
        metadata: {
          order_id: orderData.id,
          order_number: orderData.orderNumber,
          customer_email: orderData.customer.email
        },
        customer_email: orderData.customer.email,
        shipping_address_collection: {
          allowed_countries: ['DE', 'AT', 'CH'],
        },
      });

      logger.info('Stripe checkout session created', {
        sessionId: session.id,
        orderId: orderData.id
      });

      return session;
    } catch (error) {
      logger.error('Error creating Stripe checkout session:', error);
      throw new Error('Fehler beim Erstellen der Zahlungssession');
    }
  }

  async retrieveSession(sessionId) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        // Return simulated session data
        return {
          id: sessionId,
          payment_status: 'paid',
          payment_intent: 'pi_simulated_' + Date.now(),
          metadata: {
            order_id: 'order_simulated',
            order_number: 'SUN' + Date.now().toString().slice(-6)
          }
        };
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      logger.error('Error retrieving Stripe session:', error);
      throw new Error('Fehler beim Abrufen der Zahlungssession');
    }
  }

  async handleWebhook(event) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        // Simulate webhook processing
        return this.simulateWebhookProcessing(event);
      }

      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutSessionCompleted(event.data.object);
        
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data.object);
        
        default:
          logger.info(`Unhandled event type: ${event.type}`);
          return { processed: false, message: 'Event type not handled' };
      }
    } catch (error) {
      logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  async handleCheckoutSessionCompleted(session) {
    const orderId = session.metadata?.order_id;
    const orderNumber = session.metadata?.order_number;

    if (!orderId) {
      throw new Error('Order ID not found in session metadata');
    }

    // Update order status
    await database.run(
      `UPDATE orders SET 
        status = 'paid',
        stripe_payment_id = ?,
        stripe_session_id = ?,
        paid_at = ?
       WHERE id = ?`,
      [session.payment_intent, session.id, new Date().toISOString(), orderId]
    );

    // Get updated order for email
    const order = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);

    // Send confirmation email
    if (order) {
      emailService.sendOrderConfirmation(order).catch(error => {
        logger.error('Failed to send order confirmation email:', error);
      });
    }

    logger.info('Order marked as paid', {
      orderId,
      orderNumber,
      sessionId: session.id,
      paymentIntent: session.payment_intent
    });

    return {
      processed: true,
      orderId,
      orderNumber,
      status: 'paid'
    };
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    // Find order by payment intent
    const order = await database.get(
      'SELECT * FROM orders WHERE stripe_payment_id = ?',
      [paymentIntent.id]
    );

    if (!order) {
      logger.warn('Order not found for payment intent:', paymentIntent.id);
      return { processed: false, message: 'Order not found' };
    }

    // Update order status
    await database.run(
      `UPDATE orders SET 
        status = 'paid',
        paid_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), order.id]
    );

    // Send confirmation email
    emailService.sendOrderConfirmation(order).catch(error => {
      logger.error('Failed to send order confirmation email:', error);
    });

    logger.info('Payment intent succeeded', {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentIntent: paymentIntent.id
    });

    return {
      processed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      status: 'paid'
    };
  }

  async handlePaymentIntentFailed(paymentIntent) {
    // Find order by payment intent
    const order = await database.get(
      'SELECT * FROM orders WHERE stripe_payment_id = ?',
      [paymentIntent.id]
    );

    if (!order) {
      logger.warn('Order not found for failed payment intent:', paymentIntent.id);
      return { processed: false, message: 'Order not found' };
    }

    // Update order status
    await database.run(
      `UPDATE orders SET 
        status = 'failed',
        updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), order.id]
    );

    // Send payment failed email
    emailService.sendPaymentFailedEmail(order).catch(error => {
      logger.error('Failed to send payment failed email:', error);
    });

    logger.info('Payment intent failed', {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentIntent: paymentIntent.id
    });

    return {
      processed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      status: 'failed'
    };
  }

  simulateWebhookProcessing(event) {
    // For development without Stripe keys
    logger.info('Simulating webhook processing', { eventType: event.type });
    
    return {
      processed: true,
      message: 'Webhook processed (simulated)',
      orderId: 'simulated_order',
      status: 'paid'
    };
  }
}

module.exports = new StripeService();
