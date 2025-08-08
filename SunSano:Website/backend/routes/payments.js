const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const router = express.Router();

// Import services
const PaymentService = require('../services/paymentService');
const OrderService = require('../services/orderService');
const { logger } = require('../utils/logger');

// GET /api/payments/:paymentId/status - Check payment status
router.get('/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const paymentStatus = await PaymentService.getPaymentStatus(paymentId);

    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        error: 'Zahlung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Prüfen des Zahlungsstatus'
    });
  }
});

// POST /api/payments/webhook - Payment provider webhook
router.post('/webhook', [
  body('paymentId').notEmpty().withMessage('Payment ID erforderlich'),
  body('status').isIn(['completed', 'failed', 'pending', 'cancelled']).withMessage('Gültiger Status erforderlich'),
  body('amount').isFloat({ min: 0 }).withMessage('Gültiger Betrag erforderlich'),
  body('signature').notEmpty().withMessage('Webhook-Signatur erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Webhook validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentId, status, amount, signature, orderId } = req.body;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'default-secret')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', { paymentId, receivedSignature: signature });
      return res.status(401).json({
        success: false,
        error: 'Ungültige Webhook-Signatur'
      });
    }

    // Process webhook
    const result = await PaymentService.processWebhook({
      paymentId,
      status,
      amount,
      orderId
    });

    logger.info('Webhook processed successfully', {
      paymentId,
      status,
      orderId: result.orderId
    });

    res.json({
      success: true,
      data: result,
      message: 'Webhook erfolgreich verarbeitet'
    });

  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Webhook-Verarbeitung'
    });
  }
});

// POST /api/payments/retry - Retry failed payment
router.post('/retry', [
  body('paymentId').notEmpty().withMessage('Payment ID erforderlich'),
  body('orderId').notEmpty().withMessage('Order ID erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentId, orderId } = req.body;
    const result = await PaymentService.retryPayment(paymentId, orderId);

    logger.info('Payment retry initiated', {
      paymentId,
      orderId,
      newPaymentId: result.newPaymentId
    });

    res.json({
      success: true,
      data: result,
      message: 'Zahlung wird erneut versucht'
    });

  } catch (error) {
    logger.error('Error retrying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Wiederholen der Zahlung'
    });
  }
});

// POST /api/payments/refund - Process refund
router.post('/refund', [
  body('paymentId').notEmpty().withMessage('Payment ID erforderlich'),
  body('amount').isFloat({ min: 0 }).withMessage('Gültiger Betrag erforderlich'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentId, amount, reason } = req.body;
    const refund = await PaymentService.processRefund(paymentId, amount, reason);

    logger.info('Refund processed', {
      paymentId,
      refundId: refund.refundId,
      amount,
      reason
    });

    res.json({
      success: true,
      data: refund,
      message: 'Rückerstattung erfolgreich verarbeitet'
    });

  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Rückerstattung'
    });
  }
});

// GET /api/payments/stats - Payment statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = await PaymentService.getPaymentStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Zahlungsstatistiken'
    });
  }
});

module.exports = router;
