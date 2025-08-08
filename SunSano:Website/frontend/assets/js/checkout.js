/* SunSano Checkout System - Enhanced with Payment Status Management */

class PaymentStateMachine {
  constructor(orderId) {
    this.orderId = orderId;
    this.currentState = 'pending';
    this.transitions = {
      pending: ['processing', 'failed'],
      processing: ['paid', 'failed', 'timeout'],
      paid: [],
      failed: ['retry'],
      timeout: ['retry']
    };
    this.history = [];
    this.logTransition('initialized');
  }

  transition(newState) {
    if (this.transitions[this.currentState].includes(newState)) {
      const oldState = this.currentState;
      this.currentState = newState;
      this.history.push({
        from: oldState,
        to: newState,
        timestamp: new Date().toISOString()
      });
      this.logTransition(newState);
      return true;
    }
    console.warn(`Invalid transition from ${this.currentState} to ${newState}`);
    return false;
  }

  logTransition(state) {
    console.log(`[PaymentStateMachine] Order ${this.orderId}: ${this.currentState} → ${state}`);
  }

  canTransitionTo(state) {
    return this.transitions[this.currentState].includes(state);
  }
}

class PaymentLogger {
  static log(event, data) {
    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      orderId: data.orderId,
      ...data
    };
    
    console.log(`[PaymentLogger] ${JSON.stringify(logEntry)}`);
    
    // Store in localStorage for debugging
    const logs = JSON.parse(localStorage.getItem('payment-logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 100) logs.shift(); // Keep only last 100 logs
    localStorage.setItem('payment-logs', JSON.stringify(logs));
  }
}

class CheckoutSystem {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4; // Added payment processing step
    this.orderData = {
      items: [],
      customer: {},
      delivery: {},
      payment: {},
      orderNumber: null,
      orderDate: null
    };
    this.paymentStateMachine = null;
    this.paymentPollingInterval = null;
    this.webhookRetryCount = 0;
    this.maxWebhookRetries = 3;
    this.init();
  }

  init() {
    this.createCheckoutModal();
    this.bindEvents();
  }

  createCheckoutModal() {
    const modalHTML = `
      <div class="modal" id="checkout-modal" aria-hidden="true">
        <div class="modal__overlay" id="checkout-overlay"></div>
        <div class="modal__content modal__content--checkout">
          <div class="modal__header">
            <h3>Bestellung abschließen</h3>
            <button class="modal__close" id="checkout-close" aria-label="Schließen">×</button>
          </div>
          
          <div class="checkout-content">
            <!-- Progress Bar -->
            <div class="checkout-progress">
              <div class="progress-step ${this.currentStep >= 1 ? 'active' : ''}" data-step="1">
                <span class="step-number">1</span>
                <span class="step-label">Warenkorb</span>
              </div>
              <div class="progress-step ${this.currentStep >= 2 ? 'active' : ''}" data-step="2">
                <span class="step-number">2</span>
                <span class="step-label">Daten</span>
              </div>
              <div class="progress-step ${this.currentStep >= 3 ? 'active' : ''}" data-step="3">
                <span class="step-number">3</span>
                <span class="step-label">Zahlung</span>
              </div>
              <div class="progress-step ${this.currentStep >= 4 ? 'active' : ''}" data-step="4">
                <span class="step-number">4</span>
                <span class="step-label">Verarbeitung</span>
              </div>
            </div>

            <!-- Step Content -->
            <div class="checkout-steps">
              <!-- Step 1: Cart Review -->
              <div class="checkout-step" id="step-1" ${this.currentStep === 1 ? '' : 'style="display: none;"'}>
                <h4>Warenkorb überprüfen</h4>
                <div class="checkout-cart" id="checkout-cart-items"></div>
                <div class="checkout-summary">
                  <div class="summary-row">
                    <span>Zwischensumme:</span>
                    <span id="checkout-subtotal">€0,00</span>
                  </div>
                  <div class="summary-row">
                    <span>Lieferung:</span>
                    <span id="checkout-delivery">€2,50</span>
                  </div>
                  <div class="summary-row summary-total">
                    <span>Gesamt:</span>
                    <span id="checkout-total">€0,00</span>
                  </div>
                </div>
                <div class="checkout-actions">
                  <button class="btn btn--secondary" id="back-to-cart">Zurück zum Warenkorb</button>
                  <button class="btn btn--primary" id="next-to-data">Weiter zu Daten</button>
                </div>
              </div>

              <!-- Step 2: Customer Data -->
              <div class="checkout-step" id="step-2" ${this.currentStep === 2 ? '' : 'style="display: none;"'}>
                <h4>Kundendaten</h4>
                <form class="checkout-form" id="customer-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label for="firstname">Vorname *</label>
                      <input type="text" id="firstname" name="firstname" required>
                    </div>
                    <div class="form-group">
                      <label for="lastname">Nachname *</label>
                      <input type="text" id="lastname" name="lastname" required>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="email">E-Mail *</label>
                    <input type="email" id="email" name="email" required>
                  </div>
                  <div class="form-group">
                    <label for="phone">Telefon</label>
                    <input type="tel" id="phone" name="phone">
                  </div>
                  <div class="form-group">
                    <label for="address">Straße & Hausnummer *</label>
                    <input type="text" id="address" name="address" required>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label for="zipcode">PLZ *</label>
                      <input type="text" id="zipcode" name="zipcode" required>
                    </div>
                    <div class="form-group">
                      <label for="city">Stadt *</label>
                      <input type="text" id="city" name="city" required>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="notes">Anmerkungen</label>
                    <textarea id="notes" name="notes" rows="3" placeholder="Besondere Wünsche oder Hinweise..."></textarea>
                  </div>
                </form>
                <div class="checkout-actions">
                  <button class="btn btn--secondary" id="back-to-cart-step">Zurück</button>
                  <button class="btn btn--primary" id="next-to-payment">Weiter zur Zahlung</button>
                </div>
              </div>

              <!-- Step 3: Payment Method -->
              <div class="checkout-step" id="step-3" ${this.currentStep === 3 ? '' : 'style="display: none;"'}>
                <h4>Zahlungsart</h4>
                <div class="payment-methods">
                  <div class="payment-method">
                    <input type="radio" id="payment-cash" name="payment" value="cash" checked>
                    <label for="payment-cash">
                      <span class="payment-icon">💵</span>
                      <span class="payment-text">
                        <strong>Barzahlung bei Lieferung</strong>
                        <small>Zahlen Sie bequem bei der Lieferung</small>
                      </span>
                    </label>
                  </div>
                  <div class="payment-method">
                    <input type="radio" id="payment-card" name="payment" value="card">
                    <label for="payment-card">
                      <span class="payment-icon">💳</span>
                      <span class="payment-text">
                        <strong>Kartenzahlung</strong>
                        <small>EC-Karte oder Kreditkarte</small>
                      </span>
                    </label>
                  </div>
                  <div class="payment-method">
                    <input type="radio" id="payment-paypal" name="payment" value="paypal">
                    <label for="payment-paypal">
                      <span class="payment-icon">📱</span>
                      <span class="payment-text">
                        <strong>PayPal</strong>
                        <small>Schnell und sicher online bezahlen</small>
                      </span>
                    </label>
                  </div>
                </div>
                
                <div class="order-summary">
                  <h5>Bestellübersicht</h5>
                  <div class="summary-items" id="final-summary"></div>
                  <div class="summary-total-final">
                    <span>Gesamtbetrag:</span>
                    <span id="final-total">€0,00</span>
                  </div>
                </div>

                <div class="checkout-actions">
                  <button class="btn btn--secondary" id="back-to-data-step">Zurück</button>
                  <button class="btn btn--primary" id="place-order">Bestellung aufgeben</button>
                </div>
              </div>

              <!-- Step 4: Payment Processing -->
              <div class="checkout-step" id="step-4" ${this.currentStep === 4 ? '' : 'style="display: none;"'}>
                <div class="payment-processing">
                  <div class="processing-status" id="processing-status">
                    <div class="processing-icon">⏳</div>
                    <h4>Zahlung wird verarbeitet...</h4>
                    <p id="processing-message">Bitte warten Sie, während wir Ihre Zahlung verarbeiten.</p>
                  </div>
                  <div class="processing-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" id="progress-fill"></div>
                    </div>
                  </div>
                  <div class="processing-details" id="processing-details"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  bindEvents() {
    // Navigation buttons
    document.getElementById('next-to-data')?.addEventListener('click', () => this.nextStep());
    document.getElementById('next-to-payment')?.addEventListener('click', () => this.nextStep());
    document.getElementById('back-to-cart-step')?.addEventListener('click', () => this.prevStep());
    document.getElementById('back-to-data-step')?.addEventListener('click', () => this.prevStep());
    document.getElementById('back-to-cart')?.addEventListener('click', () => this.closeCheckout());
    
    // Close buttons
    document.getElementById('checkout-close')?.addEventListener('click', () => this.closeCheckout());
    document.getElementById('checkout-overlay')?.addEventListener('click', () => this.closeCheckout());
    
    // Place order
    document.getElementById('place-order')?.addEventListener('click', () => this.placeOrder());
  }

  startCheckout(cartItems) {
    this.orderData.items = [...cartItems];
    this.currentStep = 1;
    this.updateProgress();
    this.showStep(1);
    this.renderCartReview();
    this.showCheckoutModal();
  }

  showCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
    }
  }

  closeCheckout() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('is-open');
    }
    this.cleanupPaymentProcessing();
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
        this.updateProgress();
        this.showStep(this.currentStep);
        this.loadStepData();
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateProgress();
      this.showStep(this.currentStep);
    }
  }

  validateCurrentStep() {
    if (this.currentStep === 2) {
      const form = document.getElementById('customer-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }
      this.saveCustomerData();
      return true;
    }
    return true;
  }

  saveCustomerData() {
    const form = document.getElementById('customer-form');
    const formData = new FormData(form);
    this.orderData.customer = Object.fromEntries(formData);
  }

  updateProgress() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.toggle('active', stepNumber <= this.currentStep);
    });
  }

  showStep(stepNumber) {
    document.querySelectorAll('.checkout-step').forEach((step, index) => {
      step.style.display = (index + 1 === stepNumber) ? 'block' : 'none';
    });
  }

  loadStepData() {
    if (this.currentStep === 3) {
      this.renderFinalSummary();
    }
  }

  renderCartReview() {
    const cartContainer = document.getElementById('checkout-cart-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');
    
    if (!cartContainer) return;
    
    const deliveryCost = 2.50;
    const subtotal = this.orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + deliveryCost;
    
    cartContainer.innerHTML = this.orderData.items.map(item => `
      <div class="checkout-item">
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-quantity">${item.quantity}x</span>
        </div>
        <span class="item-price">€${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');
    
    if (subtotalEl) subtotalEl.textContent = `€${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
  }

  renderFinalSummary() {
    const summaryContainer = document.getElementById('final-summary');
    const totalEl = document.getElementById('final-total');
    
    if (!summaryContainer) return;
    
    const deliveryCost = 2.50;
    const subtotal = this.orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + deliveryCost;
    
    summaryContainer.innerHTML = `
      <div class="summary-item">
        <span>${this.orderData.items.length} Artikel</span>
        <span>€${subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <span>Lieferung</span>
        <span>€${deliveryCost.toFixed(2)}</span>
      </div>
    `;
    
    if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
  }

  async placeOrder() {
    const orderButton = document.getElementById('place-order');
    if (orderButton) {
      orderButton.disabled = true;
      orderButton.textContent = 'Bestellung wird verarbeitet...';
    }
    
    try {
      // Generate order number and initialize payment state machine
      const orderNumber = 'SUN' + Date.now().toString().slice(-6);
      this.orderData.orderNumber = orderNumber;
      this.orderData.orderDate = new Date().toISOString();
      
      this.paymentStateMachine = new PaymentStateMachine(orderNumber);
      
      // Log order initiation
      PaymentLogger.log('order_initiated', {
        orderId: orderNumber,
        paymentMethod: this.getSelectedPaymentMethod(),
        amount: this.getTotalAmount(),
        customer: this.orderData.customer
      });
      
      // Move to payment processing step
      this.currentStep = 4;
      this.updateProgress();
      this.showStep(4);
      
      // Create order and redirect to Stripe
      await this.createStripeCheckoutSession();
      
    } catch (error) {
      console.error('Order processing failed:', error);
      PaymentLogger.log('order_failed', {
        orderId: this.orderData.orderNumber,
        error: error.message
      });
      
      this.showPaymentError('Es gab einen Fehler bei der Bestellung. Bitte versuchen Sie es erneut.');
      
      if (orderButton) {
        orderButton.disabled = false;
        orderButton.textContent = 'Bestellung aufgeben';
      }
    }
  }

  getSelectedPaymentMethod() {
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    return selectedPayment ? selectedPayment.value : 'card';
  }

  getTotalAmount() {
    const subtotal = this.orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return subtotal + 2.50; // Including delivery
  }

  async createStripeCheckoutSession() {
    const paymentMethod = this.getSelectedPaymentMethod();
    const amount = this.getTotalAmount();
    
    // Update processing status
    this.updateProcessingStatus('creating_session', 'Zahlungssession wird erstellt...');
    
    try {
      // Call backend to create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData: {
            ...this.orderData,
            paymentMethod: paymentMethod,
            subtotal: this.orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            deliveryCost: 2.50,
            total: amount
          }
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.sessionUrl) {
        // Log successful session creation
        PaymentLogger.log('stripe_session_created', {
          orderId: result.data.orderId,
          orderNumber: result.data.orderNumber,
          sessionId: result.data.sessionId
        });
        
        // Store session info for later verification
        this.currentSessionId = result.data.sessionId;
        this.currentOrderId = result.data.orderId;
        
        // Redirect to Stripe checkout
        window.location.href = result.data.sessionUrl;
      } else {
        throw new Error(result.error || 'Failed to create checkout session');
      }
      
    } catch (error) {
      console.error('Error creating Stripe session:', error);
      this.paymentStateMachine.transition('failed');
      throw new Error('Fehler beim Erstellen der Zahlungssession: ' + error.message);
    }
  }

  async checkPaymentStatus(sessionId) {
    try {
      const response = await fetch(`/api/stripe/session/${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to check payment status');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  }

  async processPayment() {
    const paymentMethod = this.getSelectedPaymentMethod();
    const amount = this.getTotalAmount();
    
    // Update processing status
    this.updateProcessingStatus('payment_initiated', 'Zahlung wird initialisiert...');
    
    try {
      // Simulate payment provider API call
      const paymentResult = await this.callPaymentProvider(paymentMethod, amount);
      
      if (paymentResult.success) {
        // Start webhook simulation and polling
        this.startPaymentMonitoring(paymentResult.paymentId);
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
      
    } catch (error) {
      this.paymentStateMachine.transition('failed');
      throw error;
    }
  }

  async callPaymentProvider(paymentMethod, amount) {
    // Simulate payment provider API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate for demo
        
        if (success) {
          resolve({
            success: true,
            paymentId: 'PAY' + Date.now().toString().slice(-8),
            status: 'pending'
          });
        } else {
          resolve({
            success: false,
            error: 'Payment provider temporarily unavailable'
          });
        }
      }, 2000);
    });
  }

  startPaymentMonitoring(paymentId) {
    this.updateProcessingStatus('payment_pending', 'Zahlung wird verarbeitet...');
    this.paymentStateMachine.transition('processing');
    
    // Start polling for payment status
    this.startPaymentPolling(paymentId);
    
    // Simulate webhook (with potential failure)
    this.simulateWebhook(paymentId);
  }

  startPaymentPolling(paymentId) {
    let pollCount = 0;
    const maxPolls = 20; // 10 minutes with 30-second intervals
    
    this.paymentPollingInterval = setInterval(async () => {
      pollCount++;
      
      try {
        const status = await this.checkPaymentStatus(paymentId);
        
        if (status === 'completed') {
          this.handlePaymentSuccess(paymentId);
        } else if (status === 'failed') {
          this.handlePaymentFailure(paymentId, 'Payment failed');
        } else if (pollCount >= maxPolls) {
          this.handlePaymentTimeout(paymentId);
        } else {
          this.updateProcessingStatus('payment_polling', `Status wird überprüft... (${pollCount}/${maxPolls})`);
        }
      } catch (error) {
        console.error('Payment polling error:', error);
        if (pollCount >= maxPolls) {
          this.handlePaymentTimeout(paymentId);
        }
      }
    }, 30000); // 30 seconds
  }

  async checkPaymentStatus(paymentId) {
    // Simulate payment status check
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
      }, 1000);
    });
  }

  simulateWebhook(paymentId) {
    // Simulate webhook with potential failure
    setTimeout(() => {
      const webhookSuccess = Math.random() > 0.3; // 70% webhook success rate
      
      if (webhookSuccess) {
        this.handleWebhookSuccess(paymentId);
      } else {
        this.handleWebhookFailure(paymentId);
      }
    }, 5000 + Math.random() * 10000); // 5-15 seconds
  }

  handleWebhookSuccess(paymentId) {
    PaymentLogger.log('webhook_success', {
      orderId: this.orderData.orderNumber,
      paymentId,
      webhookType: 'payment_completed'
    });
    
    // If payment is still pending, complete it
    if (this.paymentStateMachine.currentState === 'processing') {
      this.handlePaymentSuccess(paymentId);
    }
  }

  handleWebhookFailure(paymentId) {
    PaymentLogger.log('webhook_failure', {
      orderId: this.orderData.orderNumber,
      paymentId,
      retryCount: this.webhookRetryCount
    });
    
    // Retry webhook if possible
    if (this.webhookRetryCount < this.maxWebhookRetries) {
      this.webhookRetryCount++;
      setTimeout(() => {
        this.simulateWebhook(paymentId);
      }, 10000); // Retry after 10 seconds
    }
  }

  handlePaymentSuccess(paymentId) {
    this.cleanupPaymentProcessing();
    this.paymentStateMachine.transition('paid');
    
    PaymentLogger.log('payment_success', {
      orderId: this.orderData.orderNumber,
      paymentId,
      amount: this.getTotalAmount()
    });
    
    this.updateProcessingStatus('payment_success', 'Zahlung erfolgreich!');
    setTimeout(() => {
      this.showOrderConfirmation();
    }, 2000);
  }

  handlePaymentFailure(paymentId, reason) {
    this.cleanupPaymentProcessing();
    this.paymentStateMachine.transition('failed');
    
    PaymentLogger.log('payment_failed', {
      orderId: this.orderData.orderNumber,
      paymentId,
      reason
    });
    
    this.showPaymentError(`Zahlung fehlgeschlagen: ${reason}`);
  }

  handlePaymentTimeout(paymentId) {
    this.cleanupPaymentProcessing();
    this.paymentStateMachine.transition('timeout');
    
    PaymentLogger.log('payment_timeout', {
      orderId: this.orderData.orderNumber,
      paymentId
    });
    
    this.showPaymentError('Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.');
  }

  updateProcessingStatus(status, message) {
    const statusEl = document.getElementById('processing-status');
    const messageEl = document.getElementById('processing-message');
    const detailsEl = document.getElementById('processing-details');
    
    if (statusEl && messageEl) {
      let icon = '⏳';
      let color = 'var(--color-primary)';
      
      switch (status) {
        case 'payment_success':
          icon = '✅';
          color = '#2e7d32';
          break;
        case 'payment_failed':
        case 'payment_timeout':
          icon = '❌';
          color = '#d32f2f';
          break;
      }
      
      statusEl.querySelector('.processing-icon').textContent = icon;
      statusEl.style.color = color;
      messageEl.textContent = message;
    }
    
    if (detailsEl) {
      const details = `
        <div class="processing-detail">
          <strong>Bestellnummer:</strong> ${this.orderData.orderNumber}
        </div>
        <div class="processing-detail">
          <strong>Status:</strong> ${this.paymentStateMachine?.currentState || 'unknown'}
        </div>
        <div class="processing-detail">
          <strong>Zeitstempel:</strong> ${new Date().toLocaleTimeString('de-DE')}
        </div>
      `;
      detailsEl.innerHTML = details;
    }
  }

  showPaymentError(message) {
    this.updateProcessingStatus('payment_failed', message);
    
    setTimeout(() => {
      // Go back to payment step
      this.currentStep = 3;
      this.updateProgress();
      this.showStep(3);
      
      const orderButton = document.getElementById('place-order');
      if (orderButton) {
        orderButton.disabled = false;
        orderButton.textContent = 'Bestellung aufgeben';
      }
    }, 3000);
  }

  cleanupPaymentProcessing() {
    if (this.paymentPollingInterval) {
      clearInterval(this.paymentPollingInterval);
      this.paymentPollingInterval = null;
    }
  }

  showOrderConfirmation() {
    const checkoutContent = document.querySelector('.checkout-content');
    if (!checkoutContent) return;
    
    checkoutContent.innerHTML = `
      <div class="order-confirmation">
        <div class="confirmation-icon">✅</div>
        <h3>Bestellung erfolgreich!</h3>
        <p>Vielen Dank für Ihre Bestellung bei SunSano.</p>
        <div class="order-details">
          <p><strong>Bestellnummer:</strong> ${this.orderData.orderNumber}</p>
          <p><strong>Bestelldatum:</strong> ${new Date(this.orderData.orderDate).toLocaleDateString('de-DE')}</p>
          <p><strong>Gesamtbetrag:</strong> €${this.getTotalAmount().toFixed(2)}</p>
          <p><strong>Zahlungsstatus:</strong> ${this.paymentStateMachine?.currentState || 'unknown'}</p>
        </div>
        <p>Wir werden Sie per E-Mail über den Status Ihrer Bestellung informieren.</p>
        <button class="btn btn--primary" onclick="location.reload()">Zurück zur Startseite</button>
      </div>
    `;
  }
}

// Initialize checkout system
let checkoutSystem;

// Export for use in main.js
window.initCheckout = function(cartItems) {
  if (!checkoutSystem) {
    checkoutSystem = new CheckoutSystem();
  }
  checkoutSystem.startCheckout(cartItems);
};

// Debug function to view payment logs
window.viewPaymentLogs = function() {
  const logs = JSON.parse(localStorage.getItem('payment-logs') || '[]');
  console.table(logs);
  return logs;
};
