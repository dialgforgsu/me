/* ============================================
   G-SU PAEK — script.js
   ============================================ */

// Theme toggle — persists to localStorage
const html         = document.documentElement;
const themeToggle  = document.getElementById('themeToggle');
const savedTheme   = localStorage.getItem('gsupaek_theme') || 'dark';

html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('gsupaek_theme', next);
});

// Nav: scroll state
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// Nav: mobile toggle
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  // Animate hamburger → X
  const spans = navToggle.querySelectorAll('span');
  if (open) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    const spans = navToggle.querySelectorAll('span');
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => revealObserver.observe(el));

// Add reveal classes to key elements after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const toReveal = [
    '.about__image-wrap',
    '.about__text',
    '.reel__embed',
    '.improv__card',
    '.show__item',
    '.contact__left',
    '.contact__right',
  ];
  toReveal.forEach((selector, groupIdx) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      if (i > 0) el.classList.add(`reveal--delay-${Math.min(i, 4)}`);
    });
  });
  revealEls.forEach(el => revealObserver.observe(el));
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});

// Visitor counter — uses localStorage to track unique-device visits
// and countapi.xyz to keep a global running total across all visitors
(function () {
  const countEl = document.getElementById('visitorCount');
  if (!countEl) return;

  const STORAGE_KEY = 'gsupaek_visited';
  const alreadyCounted = sessionStorage.getItem(STORAGE_KEY);

  const endpoint = alreadyCounted
    ? 'https://api.countapi.xyz/get/gsupaek-site/visits'
    : 'https://api.countapi.xyz/hit/gsupaek-site/visits';

  fetch(endpoint)
    .then(r => r.json())
    .then(data => {
      if (data && data.value != null) {
        countEl.textContent = data.value.toLocaleString();
        sessionStorage.setItem(STORAGE_KEY, '1');
      }
    })
    .catch(() => {
      countEl.textContent = '—';
    });
})();

// Contact form — stub handler
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Message Sent!';
    btn.style.background = '#2ecc71';
    btn.style.borderColor = '#2ecc71';
    btn.style.color = '#fff';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.disabled = false;
      form.reset();
    }, 3000);
  });
}
