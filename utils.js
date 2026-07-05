'use strict';
/* eslint-disable no-unused-vars -- consumed as globals by script.js / chatbot.js / hotpot.js */

// Shared helpers — loaded before script.js / chatbot.js / hotpot.js on every page.

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? url : '';
  } catch { return ''; }
}

// Known ticket links for upcoming shows, keyed by a title match.
// Falls back to the show's own url/description link when no rule matches.
var TICKET_URLS = [
  { match: /y.?all we asian/i, url: 'https://www.eventbrite.com/e/yall-we-asian-hot-stories-hotter-comedy-tickets-162922468489' },
  { match: /teenage dirtbag/i, url: 'https://www.eventbrite.com/e/teenage-dirtbag-nostalgia-fueled-improv-comedy-tickets-415633931277' },
];

function resolveTicketUrl(show) {
  for (var i = 0; i < TICKET_URLS.length; i++) {
    if (TICKET_URLS[i].match.test(show.title)) return TICKET_URLS[i].url;
  }
  if (show.url) return show.url;
  if (show.description) {
    var m = show.description.match(/https?:\/\/[^\s<>"]+/);
    if (m) return m[0];
  }
  return '';
}
