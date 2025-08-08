const { logger } = require('../utils/logger');

// In-memory storage for demo (replace with database in production)
let orders = new Map();
let orderStats = {
  total: 0,
  pending: 0,
  processing: 0,
  paid: 0,
  failed: 0,
  cancelled: 0,
  shipped: 0,
  delivered: 0
};

class OrderService {
  // Create new order
  static async createOrder(orderData) {
    const order = {
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.set(order.id, order);
    orderStats.total++;
    orderStats.pending++;

    logger.info('Order created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer.email,
      total: order.total
    });

    return order;
  }

  // Get order by ID
  static async getOrderById(orderId) {
    return orders.get(orderId) || null;
  }

  // Get all orders with pagination and filtering
  static async getAllOrders(options = {}) {
    const { page = 1, limit = 20, status, customerEmail } = options;
    
    let filteredOrders = Array.from(orders.values());
    
    // Apply filters
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }
    
    if (customerEmail) {
      filteredOrders = filteredOrders.filter(order => 
        order.customer.email.toLowerCase().includes(customerEmail.toLowerCase())
      );
    }

    // Sort by creation date (newest first)
    filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      orders: paginatedOrders,
      total: filteredOrders.length,
      page,
      limit,
      totalPages: Math.ceil(filteredOrders.length / limit)
    };
  }

  // Update order status
  static async updateOrderStatus(orderId, newStatus, notes = '') {
    const order = orders.get(orderId);
    if (!order) {
      return null;
    }

    const oldStatus = order.status;
    
    // Update order
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    
    if (notes) {
      order.notes = order.notes || [];
      order.notes.push({
        text: notes,
        timestamp: new Date().toISOString(),
        type: 'status_update'
      });
    }

    orders.set(orderId, order);

    // Update stats
    if (orderStats[oldStatus] > 0) {
      orderStats[oldStatus]--;
    }
    if (orderStats[newStatus] !== undefined) {
      orderStats[newStatus]++;
    }

    logger.info('Order status updated', {
      orderId,
      orderNumber: order.orderNumber,
      oldStatus,
      newStatus,
      notes
    });

    return {
      ...order,
      previousStatus: oldStatus
    };
  }

  // Cancel order
  static async cancelOrder(orderId) {
    const order = orders.get(orderId);
    if (!order) {
      return null;
    }

    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      throw new Error('Only pending orders can be cancelled');
    }

    const cancelledOrder = await this.updateOrderStatus(orderId, 'cancelled', 'Order cancelled by customer');

    logger.info('Order cancelled', {
      orderId,
      orderNumber: order.orderNumber,
      customer: order.customer.email
    });

    return cancelledOrder;
  }

  // Get order statistics
  static async getOrderStats() {
    return {
      ...orderStats,
      averageOrderValue: this.calculateAverageOrderValue(),
      recentOrders: this.getRecentOrders(7) // Last 7 days
    };
  }

  // Calculate average order value
  static calculateAverageOrderValue() {
    const completedOrders = Array.from(orders.values()).filter(
      order => ['paid', 'shipped', 'delivered'].includes(order.status)
    );

    if (completedOrders.length === 0) return 0;

    const totalValue = completedOrders.reduce((sum, order) => sum + order.total, 0);
    return (totalValue / completedOrders.length).toFixed(2);
  }

  // Get recent orders
  static getRecentOrders(days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return Array.from(orders.values()).filter(
      order => new Date(order.createdAt) >= cutoffDate
    ).length;
  }

  // Search orders
  static async searchOrders(query) {
    const searchTerm = query.toLowerCase();
    
    return Array.from(orders.values()).filter(order => 
      order.orderNumber.toLowerCase().includes(searchTerm) ||
      order.customer.firstname.toLowerCase().includes(searchTerm) ||
      order.customer.lastname.toLowerCase().includes(searchTerm) ||
      order.customer.email.toLowerCase().includes(searchTerm)
    );
  }

  // Get orders by customer
  static async getOrdersByCustomer(customerEmail) {
    return Array.from(orders.values()).filter(
      order => order.customer.email.toLowerCase() === customerEmail.toLowerCase()
    );
  }

  // Update order items
  static async updateOrderItems(orderId, items) {
    const order = orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Only pending orders can be modified');
    }

    // Recalculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCost = 2.50;
    const total = subtotal + deliveryCost;

    order.items = items;
    order.subtotal = subtotal;
    order.deliveryCost = deliveryCost;
    order.total = total;
    order.updatedAt = new Date().toISOString();

    orders.set(orderId, order);

    logger.info('Order items updated', {
      orderId,
      orderNumber: order.orderNumber,
      newTotal: total
    });

    return order;
  }

  // Add order note
  static async addOrderNote(orderId, note, type = 'general') {
    const order = orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.notes = order.notes || [];
    order.notes.push({
      text: note,
      type,
      timestamp: new Date().toISOString()
    });

    order.updatedAt = new Date().toISOString();
    orders.set(orderId, order);

    logger.info('Order note added', {
      orderId,
      orderNumber: order.orderNumber,
      noteType: type
    });

    return order;
  }

  // Get order history
  static async getOrderHistory(orderId) {
    const order = orders.get(orderId);
    if (!order) {
      return null;
    }

    return {
      order,
      history: order.notes || [],
      statusChanges: this.getStatusChangeHistory(order)
    };
  }

  // Get status change history
  static getStatusChangeHistory(order) {
    const statusChanges = [];
    
    if (order.notes) {
      order.notes.forEach(note => {
        if (note.type === 'status_update') {
          statusChanges.push({
            status: order.status,
            timestamp: note.timestamp,
            note: note.text
          });
        }
      });
    }

    return statusChanges;
  }

  // Cleanup old orders (cron job)
  static async cleanupOldOrders() {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [orderId, order] of orders.entries()) {
      if (new Date(order.createdAt) < oneYearAgo && 
          ['delivered', 'cancelled'].includes(order.status)) {
        orders.delete(orderId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old orders', { cleanedCount });
    }

    return cleanedCount;
  }
}

module.exports = OrderService;
