'use strict';

// Visitor counter (loadVisitCount lives in utils.js)
loadVisitCount(document.getElementById('visit-text'), document.getElementById('visit-count'));

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
