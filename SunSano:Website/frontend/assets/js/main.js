/* SunSano basic interactivity */

function toggleNavigation() {
  const toggleButton = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggleButton || !nav) return;

  function setExpanded(expanded) {
    toggleButton.setAttribute('aria-expanded', String(expanded));
    nav.classList.toggle('is-open', expanded);
  }

  toggleButton.addEventListener('click', () => {
    const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
    setExpanded(!expanded);
  });

  // Close on outside click (mobile)
  document.addEventListener('click', (e) => {
    const isClickInside = nav.contains(e.target) || toggleButton.contains(e.target);
    const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
    if (!isClickInside && expanded) setExpanded(false);
  });
}

function enableSmoothAnchorScroll() {
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.offsetHeight : 0;
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;
      e.preventDefault();
      const y = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight - 6;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  });
}

// Sample reviews data
const reviews = [
  {
    id: 1,
    author: 'Mia Schmidt',
    rating: 5,
    text: 'Frischer geht\'s nicht! Mein täglicher Green Power ist einfach perfekt. Tolle Qualität und super Service.',
    date: '2025-01-15',
    helpful: 12
  },
  {
    id: 2,
    author: 'Jonas Weber',
    rating: 5,
    text: 'Schnell, lecker, nachhaltig. Genau mein Ding. Die Säfte sind immer frisch und die Preise fair.',
    date: '2025-01-14',
    helpful: 8
  },
  {
    id: 3,
    author: 'Lea Müller',
    rating: 4,
    text: 'Berry Boost ist mein Favorit – nicht zu süß, superfruchtig! Würde gerne mehr Sorten haben.',
    date: '2025-01-13',
    helpful: 15
  },
  {
    id: 4,
    author: 'Tom Fischer',
    rating: 5,
    text: 'Endlich eine Saftbar, die auf Qualität setzt. Die Zutaten sind top und man schmeckt den Unterschied.',
    date: '2025-01-12',
    helpful: 6
  },
  {
    id: 5,
    author: 'Anna Klein',
    rating: 4,
    text: 'Sehr freundlicher Service und leckere Säfte. Der Carrot Zing ist besonders empfehlenswert!',
    date: '2025-01-11',
    helpful: 9
  },
  {
    id: 6,
    author: 'Max Wagner',
    rating: 5,
    text: 'Perfekt für nach dem Sport. Die Säfte geben mir die Energie, die ich brauche. Danke SunSano!',
    date: '2025-01-10',
    helpful: 11
  },
  {
    id: 7,
    author: 'Sarah Meyer',
    rating: 3,
    text: 'Gute Säfte, aber etwas teuer. Würde gerne mehr Rabatte für Stammkunden sehen.',
    date: '2025-01-09',
    helpful: 4
  },
  {
    id: 8,
    author: 'Paul Schulz',
    rating: 5,
    text: 'Die beste Saftbar in der Stadt! Frische Zutaten und tolle Kombinationen. Bin begeistert!',
    date: '2025-01-08',
    helpful: 18
  }
];

// Shopping cart data
let cart = [];

// Product data
const products = [
  { id: 'sunny-orange', name: 'Sunny Orange', price: 3.90 },
  { id: 'green-power', name: 'Green Power', price: 4.50 },
  { id: 'berry-boost', name: 'Berry Boost', price: 4.20 },
  { id: 'carrot-zing', name: 'Carrot Zing', price: 3.80 },
  { id: 'tropic-wave', name: 'Tropic Wave', price: 4.90 },
  { id: 'citrus-splash', name: 'Citrus Splash', price: 4.10 }
];

function createStarRating(rating) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(`<span class="star ${i <= rating ? '' : 'star--empty'}">★</span>`);
  }
  return stars.join('');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function renderReviewCard(review) {
  return `
    <div class="review-card">
      <div class="review-card__header">
        <div>
          <div class="review-card__author">${review.author}</div>
          <div class="review-card__date">${formatDate(review.date)}</div>
        </div>
        <div class="review-card__rating">
          ${createStarRating(review.rating)}
        </div>
      </div>
      <div class="review-card__text">${review.text}</div>
    </div>
  `;
}

function loadReviewsPreview() {
  const previewGrid = document.getElementById('reviews-preview-grid');
  if (!previewGrid) return;
  
  const latestReviews = reviews.slice(0, 5);
  previewGrid.innerHTML = latestReviews.map(renderReviewCard).join('');
}

function loadAllReviews(filteredReviews = reviews) {
  const allReviewsGrid = document.getElementById('all-reviews-grid');
  if (!allReviewsGrid) return;
  
  allReviewsGrid.innerHTML = filteredReviews.map(renderReviewCard).join('');
}

function filterAndSortReviews() {
  const ratingFilter = document.getElementById('rating-filter').value;
  const sortFilter = document.getElementById('sort-filter').value;
  
  let filtered = [...reviews];
  
  // Filter by rating
  if (ratingFilter) {
    const minRating = parseInt(ratingFilter);
    filtered = filtered.filter(review => review.rating >= minRating);
  }
  
  // Sort reviews
  switch (sortFilter) {
    case 'newest':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'oldest':
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'helpful':
      filtered.sort((a, b) => b.helpful - a.helpful);
      break;
  }
  
  loadAllReviews(filtered);
}

function setupReviewsModal() {
  const showAllBtn = document.getElementById('show-all-reviews');
  const addReviewBtn = document.getElementById('add-review');
  const modal = document.getElementById('reviews-modal');
  const addReviewModal = document.getElementById('add-review-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const addReviewOverlay = document.getElementById('add-review-overlay');
  const addReviewClose = document.getElementById('add-review-close');
  const cancelReview = document.getElementById('cancel-review');
  const ratingFilter = document.getElementById('rating-filter');
  const sortFilter = document.getElementById('sort-filter');
  const reviewForm = document.getElementById('review-form');
  
  if (!showAllBtn || !modal) return;
  
  // Show all reviews
  showAllBtn.addEventListener('click', () => {
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    loadAllReviews();
  });
  
  // Add review
  if (addReviewBtn) {
    addReviewBtn.addEventListener('click', () => {
      addReviewModal.setAttribute('aria-hidden', 'false');
      addReviewModal.classList.add('is-open');
    });
  }
  
  // Close modals
  [modalOverlay, modalClose].forEach(el => {
    if (el) {
      el.addEventListener('click', () => {
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('is-open');
      });
    }
  });
  
  [addReviewOverlay, addReviewClose, cancelReview].forEach(el => {
    if (el) {
      el.addEventListener('click', () => {
        addReviewModal.setAttribute('aria-hidden', 'true');
        addReviewModal.classList.remove('is-open');
        reviewForm.reset();
      });
    }
  });
  
  // Filter and sort
  [ratingFilter, sortFilter].forEach(el => {
    if (el) {
      el.addEventListener('change', filterAndSortReviews);
    }
  });
  
  // Handle review form submission
  if (reviewForm) {
    reviewForm.addEventListener('submit', handleReviewSubmission);
  }
}

function handleReviewSubmission(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const newReview = {
    id: Date.now(), // Simple ID generation
    author: formData.get('author'),
    rating: parseInt(formData.get('rating')),
    text: formData.get('text'),
    product: formData.get('product'),
    date: new Date().toISOString().split('T')[0],
    helpful: 0
  };
  
  // Add to reviews array
  reviews.unshift(newReview); // Add to beginning
  
  // Save to localStorage
  saveReviewsToStorage();
  
  // Show success message
  showReviewSuccess();
  
  // Reset form
  e.target.reset();
  
  // Reload reviews
  loadReviewsPreview();
}

function showReviewSuccess() {
  const reviewForm = document.getElementById('review-form');
  const modalContent = document.querySelector('.modal__content--review');
  
  if (!reviewForm || !modalContent) return;
  
  reviewForm.style.display = 'none';
  
  const successHTML = `
    <div class="review-success">
      <div class="success-icon">✅</div>
      <h3>Bewertung erfolgreich!</h3>
      <p>Vielen Dank für Ihre Bewertung. Sie wird nach der Überprüfung veröffentlicht.</p>
      <button class="btn btn--primary" onclick="closeReviewModal()">Schließen</button>
    </div>
  `;
  
  modalContent.insertAdjacentHTML('beforeend', successHTML);
}

function closeReviewModal() {
  const modal = document.getElementById('add-review-modal');
  const reviewForm = document.getElementById('review-form');
  const successMessage = document.querySelector('.review-success');
  
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
  }
  
  if (reviewForm) {
    reviewForm.style.display = 'grid';
  }
  
  if (successMessage) {
    successMessage.remove();
  }
}

function saveReviewsToStorage() {
  localStorage.setItem('sunsano-reviews', JSON.stringify(reviews));
}

function loadReviewsFromStorage() {
  const saved = localStorage.getItem('sunsano-reviews');
  if (saved) {
    const savedReviews = JSON.parse(saved);
    // Merge with default reviews, avoiding duplicates
    const defaultIds = reviews.map(r => r.id);
    const newReviews = savedReviews.filter(r => !defaultIds.includes(r.id));
    reviews.unshift(...newReviews);
  }
}

// Shopping Cart Functions
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (!cartCount) return;
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  cartCount.style.display = totalItems > 0 ? 'block' : 'none';
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  updateCartCount();
  saveCartToStorage();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  updateCartCount();
  saveCartToStorage();
  renderCart();
}

function updateQuantity(productId, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }
  
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = newQuantity;
    updateCartCount();
    saveCartToStorage();
    renderCart();
  }
}

function renderCart() {
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  
  if (!cartItems || !cartTotal) return;
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Dein Warenkorb ist leer.</p>';
    cartTotal.textContent = '€0,00';
    return;
  }
  
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item__name">${item.name}</div>
      <div class="cart-item__quantity">
        <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
        <span>${item.quantity}</span>
        <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
      </div>
      <div class="cart-item__price">€${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartTotal.textContent = `€${total.toFixed(2)}`;
}

function setupCart() {
  const cartToggle = document.getElementById('cart-toggle');
  const cartModal = document.getElementById('cart-modal');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartClose = document.getElementById('cart-close');
  const clearCart = document.getElementById('clear-cart');
  const checkout = document.getElementById('checkout');
  
  if (!cartToggle || !cartModal) return;
  
  cartToggle.addEventListener('click', () => {
    cartModal.setAttribute('aria-hidden', 'false');
    cartModal.classList.add('is-open');
    renderCart();
  });
  
  [cartOverlay, cartClose].forEach(el => {
    if (el) {
      el.addEventListener('click', () => {
        cartModal.setAttribute('aria-hidden', 'true');
        cartModal.classList.remove('is-open');
      });
    }
  });
  
  if (clearCart) {
    clearCart.addEventListener('click', () => {
      cart = [];
      updateCartCount();
      saveCartToStorage();
      renderCart();
    });
  }
  
  if (checkout) {
    checkout.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Dein Warenkorb ist leer.');
        return;
      }
      // Start checkout process
      window.initCheckout(cart);
    });
  }
}

function setupProductButtons() {
  document.querySelectorAll('.btn--outline').forEach(button => {
    button.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      
      const productName = card.querySelector('.card__title').textContent;
      const product = products.find(p => p.name === productName);
      if (product) {
        addToCart(product.id);
        e.target.textContent = 'Hinzugefügt!';
        setTimeout(() => {
          e.target.textContent = 'In den Korb';
        }, 1000);
      }
    });
  });
}

function saveCartToStorage() {
  localStorage.setItem('sunsano-cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const saved = localStorage.getItem('sunsano-cart');
  if (saved) {
    cart = JSON.parse(saved);
    updateCartCount();
  }
}

function enhanceForm() {
  const form = document.querySelector('.form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    // very basic client-side validation example
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    if (!name?.value || !email?.value) {
      e.preventDefault();
      alert('Bitte Name und E‑Mail ausfüllen.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  toggleNavigation();
  enableSmoothAnchorScroll();
  enhanceForm();
  loadReviewsFromStorage();
  loadReviewsPreview();
  setupReviewsModal();
  setupCart();
  setupProductButtons();
  loadCartFromStorage();
});

// Global function for closing review modal
window.closeReviewModal = closeReviewModal;


