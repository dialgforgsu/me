'use strict';

// Applies the saved theme before first paint, so light-mode visitors don't see a
// dark flash. Loaded synchronously at the top of <head> (inline scripts are
// blocked by the CSP). The toggle itself lives in page.js.
try {
  var savedTheme = localStorage.getItem('gsupaek_theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
} catch (_) { /* storage blocked: keep the default dark theme */ }
