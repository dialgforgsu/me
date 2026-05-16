'use strict';

// Visitor counter — Supabase RPC (anon key is intentionally public)
(function () {
  const el  = document.getElementById('visit-text');
  if (!el) return;
  const URL  = 'https://zezigpysakremuredzwj.supabase.co';
  const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplemlncHlzYWtyZW11cmVkendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjkxMzAsImV4cCI6MjA5MzE0NTEzMH0.iH6DMmKH5e28TpnIezvyqn06m7LPyJGmB3bZLHi6Z0s';
  const seen = sessionStorage.getItem('gsp_me_counted');
  const fn   = seen ? 'get_page_views' : 'increment_page_views_for';
  fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ page_id: 'me-site' }),
  })
    .then(r => r.json())
    .then(n => {
      if (typeof n === 'number') {
        el.textContent = `${n.toLocaleString()} visitor${n === 1 ? '' : 's'}`;
        if (!seen) sessionStorage.setItem('gsp_me_counted', '1');
      }
    })
    .catch(() => {});
})();

// Theme toggle
const html        = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const saved       = localStorage.getItem('gsupaek_theme') || 'dark';
html.setAttribute('data-theme', saved);
themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('gsupaek_theme', next);
});

// Nav: scroll state
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});
if (window.scrollY > 40) nav.classList.add('scrolled');

// Nav: mobile toggle
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  nav.classList.toggle('menu-open', open);
  const spans = navToggle.querySelectorAll('span');
  if (open) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});
navLinks.querySelectorAll('.nav__item--dropdown').forEach(item => {
  item.querySelector('.nav__link--has-dropdown').addEventListener('click', e => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      item.classList.toggle('open');
    }
  });
});
navLinks.querySelectorAll('.nav__link:not(.nav__link--has-dropdown)').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    nav.classList.remove('menu-open');
    navLinks.querySelectorAll('.nav__item--dropdown').forEach(i => i.classList.remove('open'));
    navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});
navLinks.querySelectorAll('.nav__dropdown-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    nav.classList.remove('menu-open');
    navLinks.querySelectorAll('.nav__item--dropdown').forEach(i => i.classList.remove('open'));
    navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});
