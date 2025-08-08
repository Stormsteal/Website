const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('./utils/logger');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, 'data', 'sunsano.db');
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info('Database connected successfully');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          order_number TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'cancelled')),
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_address TEXT NOT NULL,
          customer_zipcode TEXT NOT NULL,
          customer_city TEXT NOT NULL,
          items TEXT NOT NULL,
          subtotal REAL NOT NULL,
          delivery_cost REAL NOT NULL,
          total_price REAL NOT NULL,
          payment_method TEXT NOT NULL,
          stripe_payment_id TEXT,
          stripe_session_id TEXT,
          paid_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;

      const createProductsTable = `
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category TEXT NOT NULL,
          image_url TEXT,
          available BOOLEAN DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;

      const createReviewsTable = `
        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `;

      this.db.serialize(() => {
        this.db.run(createOrdersTable, (err) => {
          if (err) {
            logger.error('Error creating orders table:', err);
            reject(err);
            return;
          }
          logger.info('Orders table created successfully');
        });

        this.db.run(createProductsTable, (err) => {
          if (err) {
            logger.error('Error creating products table:', err);
            reject(err);
            return;
          }
          logger.info('Products table created successfully');
        });

        this.db.run(createReviewsTable, (err) => {
          if (err) {
            logger.error('Error creating reviews table:', err);
            reject(err);
            return;
          }
          logger.info('Reviews table created successfully');
          resolve();
        });
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();
