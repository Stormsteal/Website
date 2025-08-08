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
});


