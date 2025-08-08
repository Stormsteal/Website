const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('Email service initialized with SMTP configuration');
    } else {
      logger.warn('Email service not configured - SMTP settings missing');
    }
  }

  async sendOrderConfirmation(order) {
    if (!this.transporter) {
      logger.warn('Email service not available - skipping order confirmation email');
      return false;
    }

    try {
      const emailContent = this.generateOrderConfirmationEmail(order);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sunsano.de',
        to: order.customer_email,
        subject: `Bestellbestätigung - ${order.order_number}`,
        html: emailContent,
        text: this.stripHtml(emailContent)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Order confirmation email sent', {
        orderId: order.id,
        orderNumber: order.order_number,
        recipient: order.customer_email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Error sending order confirmation email:', error);
      return false;
    }
  }

  generateOrderConfirmationEmail(order) {
    const items = JSON.parse(order.items);
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(2)} €</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(item.price * item.quantity).toFixed(2)} €</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bestellbestätigung - SunSano</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
          .items-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SunSano - Bestellbestätigung</h1>
          </div>
          
          <div class="content">
            <h2>Vielen Dank für Ihre Bestellung!</h2>
            <p>Hallo ${order.customer_name},</p>
            <p>wir haben Ihre Bestellung erfolgreich erhalten und werden sie schnellstmöglich für Sie zubereiten.</p>
            
            <div class="order-details">
              <h3>Bestelldetails</h3>
              <p><strong>Bestellnummer:</strong> ${order.order_number}</p>
              <p><strong>Bestelldatum:</strong> ${new Date(order.created_at).toLocaleDateString('de-DE')}</p>
              <p><strong>Status:</strong> ${order.status === 'paid' ? 'Bezahlt' : 'Ausstehend'}</p>
              <p><strong>Lieferadresse:</strong><br>
                ${order.customer_address}<br>
                ${order.customer_zipcode} ${order.customer_city}</p>
            </div>
            
            <h3>Ihre Bestellung</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th style="text-align: center;">Menge</th>
                  <th style="text-align: right;">Einzelpreis</th>
                  <th style="text-align: right;">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="total">
              <p>Zwischensumme: ${order.subtotal.toFixed(2)} €</p>
              <p>Lieferung: ${order.delivery_cost.toFixed(2)} €</p>
              <p><strong>Gesamtbetrag: ${order.total_price.toFixed(2)} €</strong></p>
            </div>
            
            <p>Wir werden Sie über den Status Ihrer Bestellung auf dem Laufenden halten.</p>
            <p>Bei Fragen erreichen Sie uns unter: info@sunsano.de</p>
          </div>
          
          <div class="footer">
            <p>SunSano - Frische Säfte & Smoothies</p>
            <p>Vielen Dank für Ihr Vertrauen!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '')
               .replace(/\s+/g, ' ')
               .trim();
  }

  async sendPaymentFailedEmail(order) {
    if (!this.transporter) {
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sunsano.de',
        to: order.customer_email,
        subject: `Zahlung fehlgeschlagen - ${order.order_number}`,
        html: `
          <h2>Zahlung fehlgeschlagen</h2>
          <p>Hallo ${order.customer_name},</p>
          <p>bei der Verarbeitung Ihrer Zahlung für Bestellung ${order.order_number} ist ein Fehler aufgetreten.</p>
          <p>Bitte versuchen Sie es erneut oder kontaktieren Sie uns für Unterstützung.</p>
          <p>Mit freundlichen Grüßen<br>Ihr SunSano Team</p>
        `,
        text: `Zahlung fehlgeschlagen - Bestellung ${order.order_number}`
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Payment failed email sent', { orderId: order.id });
      return true;
    } catch (error) {
      logger.error('Error sending payment failed email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
