const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services
const OrderService = require('../services/orderService');
const PaymentService = require('../services/paymentService');
const { logger } = require('../utils/logger');

// Validation middleware
const validateOrder = [
  body('customer.firstname').trim().isLength({ min: 2 }).withMessage('Vorname muss mindestens 2 Zeichen lang sein'),
  body('customer.lastname').trim().isLength({ min: 2 }).withMessage('Nachname muss mindestens 2 Zeichen lang sein'),
  body('customer.email').isEmail().normalizeEmail().withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('customer.address').trim().isLength({ min: 5 }).withMessage('Adresse muss mindestens 5 Zeichen lang sein'),
  body('customer.zipcode').trim().isLength({ min: 4 }).withMessage('PLZ muss mindestens 4 Zeichen lang sein'),
  body('customer.city').trim().isLength({ min: 2 }).withMessage('Stadt muss mindestens 2 Zeichen lang sein'),
  body('items').isArray({ min: 1 }).withMessage('Mindestens ein Artikel erforderlich'),
  body('items.*.id').notEmpty().withMessage('Artikel-ID erforderlich'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Menge muss mindestens 1 sein'),
  body('paymentMethod').isIn(['cash', 'card', 'paypal']).withMessage('Gültige Zahlungsart erforderlich')
];

// GET /api/orders - Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    const orders = await OrderService.getAllOrders();
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Bestellungen'
    });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await OrderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Bestellung'
    });
  }
});

// POST /api/orders - Create new order
router.post('/', validateOrder, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const orderData = {
      id: uuidv4(),
      orderNumber: 'SUN' + Date.now().toString().slice(-6),
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCost = 2.50;
    orderData.total = subtotal + deliveryCost;
    orderData.subtotal = subtotal;
    orderData.deliveryCost = deliveryCost;

    // Create order
    const order = await OrderService.createOrder(orderData);

    // Initialize payment processing
    const paymentResult = await PaymentService.initializePayment({
      orderId: order.id,
      amount: order.total,
      paymentMethod: order.paymentMethod,
      customer: order.customer
    });

    logger.info('Order created successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: paymentResult.paymentId
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        payment: paymentResult
      },
      message: 'Bestellung erfolgreich erstellt'
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Bestellung'
    });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', [
  body('status').isIn(['pending', 'processing', 'paid', 'failed', 'cancelled', 'shipped', 'delivered'])
    .withMessage('Gültiger Status erforderlich'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, notes } = req.body;
    const order = await OrderService.updateOrderStatus(req.params.id, status, notes);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    logger.info('Order status updated', {
      orderId: order.id,
      oldStatus: order.previousStatus,
      newStatus: status
    });

    res.json({
      success: true,
      data: order,
      message: 'Bestellstatus erfolgreich aktualisiert'
    });

  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Bestellstatus'
    });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', async (req, res) => {
  try {
    const order = await OrderService.cancelOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    logger.info('Order cancelled', {
      orderId: order.id,
      orderNumber: order.orderNumber
    });

    res.json({
      success: true,
      data: order,
      message: 'Bestellung erfolgreich storniert'
    });

  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Stornieren der Bestellung'
    });
  }
});

module.exports = router;
