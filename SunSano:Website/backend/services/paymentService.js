const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

// In-memory storage for demo (replace with database in production)
let payments = new Map();
let paymentStats = {
  total: 0,
  successful: 0,
  failed: 0,
  pending: 0
};

class PaymentService {
  // Initialize payment
  static async initializePayment(paymentData) {
    const { orderId, amount, paymentMethod, customer } = paymentData;
    
    const paymentId = 'PAY' + Date.now().toString().slice(-8);
    
    const payment = {
      id: paymentId,
      orderId,
      amount,
      paymentMethod,
      customer,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      webhookAttempts: 0,
      maxWebhookAttempts: 3
    };

    payments.set(paymentId, payment);
    paymentStats.total++;
    paymentStats.pending++;

    logger.info('Payment initialized', {
      paymentId,
      orderId,
      amount,
      paymentMethod
    });

    // Simulate payment provider API call
    const providerResult = await this.callPaymentProvider(payment);
    
    return {
      paymentId,
      status: providerResult.status,
      redirectUrl: providerResult.redirectUrl,
      providerReference: providerResult.providerReference
    };
  }

  // Simulate payment provider API call
  static async callPaymentProvider(payment) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
          resolve({
            status: 'pending',
            redirectUrl: `https://payment-provider.com/pay/${payment.id}`,
            providerReference: 'PROV' + Date.now().toString().slice(-6)
          });
        } else {
          resolve({
            status: 'failed',
            error: 'Payment provider temporarily unavailable'
          });
        }
      }, 1000);
    });
  }

  // Get payment status
  static async getPaymentStatus(paymentId) {
    const payment = payments.get(paymentId);
    
    if (!payment) {
      return null;
    }

    // Simulate status check with payment provider
    const providerStatus = await this.checkProviderStatus(paymentId);
    
    if (providerStatus && providerStatus !== payment.status) {
      payment.status = providerStatus;
      payment.updatedAt = new Date().toISOString();
      payments.set(paymentId, payment);
    }

    return {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      orderId: payment.orderId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };
  }

  // Simulate provider status check
  static async checkProviderStatus(paymentId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const random = Math.random();
        if (random > 0.7) {
          resolve('completed');
        } else if (random > 0.9) {
          resolve('failed');
        } else {
          resolve('pending');
        }
      }, 500);
    });
  }

  // Process webhook
  static async processWebhook(webhookData) {
    const { paymentId, status, amount, orderId } = webhookData;
    
    const payment = payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Verify amount matches
    if (payment.amount !== amount) {
      logger.warn('Webhook amount mismatch', {
        paymentId,
        expected: payment.amount,
        received: amount
      });
      throw new Error('Amount mismatch');
    }

    // Update payment status
    const oldStatus = payment.status;
    payment.status = status;
    payment.updatedAt = new Date().toISOString();
    payment.webhookAttempts++;

    payments.set(paymentId, payment);

    // Update stats
    if (oldStatus === 'pending') {
      paymentStats.pending--;
    }
    
    if (status === 'completed') {
      paymentStats.successful++;
    } else if (status === 'failed') {
      paymentStats.failed++;
    }

    logger.info('Webhook processed', {
      paymentId,
      oldStatus,
      newStatus: status,
      webhookAttempts: payment.webhookAttempts
    });

    return {
      paymentId,
      orderId: payment.orderId,
      status,
      processed: true
    };
  }

  // Retry failed payment
  static async retryPayment(paymentId, orderId) {
    const payment = payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'failed') {
      throw new Error('Payment is not in failed state');
    }

    // Create new payment attempt
    const newPaymentId = 'PAY' + Date.now().toString().slice(-8);
    const newPayment = {
      ...payment,
      id: newPaymentId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      webhookAttempts: 0,
      retryOf: paymentId
    };

    payments.set(newPaymentId, newPayment);
    paymentStats.pending++;

    logger.info('Payment retry initiated', {
      originalPaymentId: paymentId,
      newPaymentId,
      orderId
    });

    return {
      newPaymentId,
      status: 'pending'
    };
  }

  // Process refund
  static async processRefund(paymentId, amount, reason) {
    const payment = payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Payment must be completed for refund');
    }

    if (amount > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    const refundId = 'REF' + Date.now().toString().slice(-8);
    
    const refund = {
      id: refundId,
      paymentId,
      amount,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Simulate refund processing
    setTimeout(() => {
      refund.status = 'completed';
      refund.completedAt = new Date().toISOString();
      
      logger.info('Refund completed', {
        refundId,
        paymentId,
        amount,
        reason
      });
    }, 2000);

    logger.info('Refund initiated', {
      refundId,
      paymentId,
      amount,
      reason
    });

    return {
      refundId,
      paymentId,
      amount,
      status: 'pending'
    };
  }

  // Get payment statistics
  static async getPaymentStats() {
    return {
      ...paymentStats,
      successRate: paymentStats.total > 0 ? 
        (paymentStats.successful / paymentStats.total * 100).toFixed(2) : 0
    };
  }

  // Verify webhook signature
  static verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Cleanup old payments (cron job)
  static async cleanupOldPayments() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [paymentId, payment] of payments.entries()) {
      if (new Date(payment.createdAt) < thirtyDaysAgo) {
        payments.delete(paymentId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old payments', { cleanedCount });
    }

    return cleanedCount;
  }
}

module.exports = PaymentService;
