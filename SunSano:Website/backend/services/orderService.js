const { logger } = require('../utils/logger');
const database = require('../database');

class OrderService {
  // Create new order
  static async createOrder(orderData) {
    try {
      const order = {
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Insert into database
      await database.run(`
        INSERT INTO orders (
          id, order_number, status, customer_name, customer_email, 
          customer_address, customer_zipcode, customer_city, items,
          subtotal, delivery_cost, total_price, payment_method,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        order.orderNumber,
        order.status,
        `${order.customer.firstname} ${order.customer.lastname}`,
        order.customer.email,
        order.customer.address,
        order.customer.zipcode,
        order.customer.city,
        JSON.stringify(order.items),
        order.subtotal,
        order.deliveryCost,
        order.total,
        order.paymentMethod,
        order.createdAt,
        order.updatedAt
      ]);

      logger.info('Order created in database', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer.email,
        total: order.total
      });

      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw new Error('Fehler beim Erstellen der Bestellung');
    }
  }

  // Get order by ID
  static async getOrderById(orderId) {
    try {
      const order = await database.get(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (!order) {
        return null;
      }

      // Parse items JSON
      order.items = JSON.parse(order.items);
      
      return order;
    } catch (error) {
      logger.error('Error getting order by ID:', error);
      throw new Error('Fehler beim Abrufen der Bestellung');
    }
  }

  // Get all orders with pagination and filtering
  static async getAllOrders(options = {}) {
    try {
      const { page = 1, limit = 20, status, customerEmail } = options;
      
      let whereClause = '';
      let params = [];
      
      // Build WHERE clause
      if (status) {
        whereClause += ' WHERE status = ?';
        params.push(status);
      }
      
      if (customerEmail) {
        const emailClause = 'customer_email LIKE ?';
        if (whereClause) {
          whereClause += ' AND ' + emailClause;
        } else {
          whereClause = ' WHERE ' + emailClause;
        }
        params.push(`%${customerEmail}%`);
      }

      // Get total count
      const countResult = await database.get(
        `SELECT COUNT(*) as total FROM orders${whereClause}`,
        params
      );
      const total = countResult.total;

      // Get paginated results
      const offset = (page - 1) * limit;
      const orders = await database.query(
        `SELECT * FROM orders${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse items JSON for each order
      orders.forEach(order => {
        order.items = JSON.parse(order.items);
      });

      return {
        orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting all orders:', error);
      throw new Error('Fehler beim Abrufen der Bestellungen');
    }
  }

  // Update order status
  static async updateOrderStatus(orderId, newStatus, notes = '') {
    try {
      const result = await database.run(
        `UPDATE orders SET 
          status = ?, 
          updated_at = ?
         WHERE id = ?`,
        [newStatus, new Date().toISOString(), orderId]
      );

      if (result.changes === 0) {
        return null;
      }

      logger.info('Order status updated', {
        orderId,
        newStatus,
        notes
      });

      return await this.getOrderById(orderId);
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw new Error('Fehler beim Aktualisieren des Bestellstatus');
    }
  }

  // Cancel order
  static async cancelOrder(orderId) {
    try {
      const result = await database.run(
        `UPDATE orders SET 
          status = 'cancelled', 
          updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), orderId]
      );

      if (result.changes === 0) {
        return null;
      }

      logger.info('Order cancelled', { orderId });
      return await this.getOrderById(orderId);
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw new Error('Fehler beim Stornieren der Bestellung');
    }
  }

  // Get order statistics
  static async getOrderStats() {
    try {
      const stats = await database.query(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(total_price) as total_value
        FROM orders 
        GROUP BY status
      `);

      const total = await database.get('SELECT COUNT(*) as total FROM orders');
      const totalValue = await database.get('SELECT SUM(total_price) as total_value FROM orders');

      return {
        total: total.total,
        totalValue: totalValue.total_value || 0,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat.count,
            value: stat.total_value || 0
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw new Error('Fehler beim Abrufen der Bestellstatistiken');
    }
  }

  // Get orders by customer email
  static async getOrdersByCustomer(customerEmail) {
    try {
      const orders = await database.query(
        'SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC',
        [customerEmail]
      );

      // Parse items JSON for each order
      orders.forEach(order => {
        order.items = JSON.parse(order.items);
      });

      return orders;
    } catch (error) {
      logger.error('Error getting orders by customer:', error);
      throw new Error('Fehler beim Abrufen der Kundenbestellungen');
    }
  }

  // Search orders
  static async searchOrders(query) {
    try {
      const searchTerm = `%${query}%`;
      const orders = await database.query(`
        SELECT * FROM orders 
        WHERE order_number LIKE ? 
           OR customer_name LIKE ? 
           OR customer_email LIKE ?
        ORDER BY created_at DESC
      `, [searchTerm, searchTerm, searchTerm]);

      // Parse items JSON for each order
      orders.forEach(order => {
        order.items = JSON.parse(order.items);
      });

      return orders;
    } catch (error) {
      logger.error('Error searching orders:', error);
      throw new Error('Fehler bei der Bestellsuche');
    }
  }

  // Update order items
  static async updateOrderItems(orderId, items) {
    try {
      const result = await database.run(
        `UPDATE orders SET 
          items = ?,
          subtotal = ?,
          total_price = ?,
          updated_at = ?
         WHERE id = ?`,
        [
          JSON.stringify(items),
          items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 2.50, // Add delivery cost
          new Date().toISOString(),
          orderId
        ]
      );

      if (result.changes === 0) {
        return null;
      }

      logger.info('Order items updated', { orderId, itemCount: items.length });
      return await this.getOrderById(orderId);
    } catch (error) {
      logger.error('Error updating order items:', error);
      throw new Error('Fehler beim Aktualisieren der Bestellartikel');
    }
  }

  // Get recent orders
  static async getRecentOrders(days = 7) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);
      
      const orders = await database.query(
        'SELECT * FROM orders WHERE created_at >= ? ORDER BY created_at DESC',
        [date.toISOString()]
      );

      // Parse items JSON for each order
      orders.forEach(order => {
        order.items = JSON.parse(order.items);
      });

      return orders;
    } catch (error) {
      logger.error('Error getting recent orders:', error);
      throw new Error('Fehler beim Abrufen der letzten Bestellungen');
    }
  }
}

module.exports = OrderService;
