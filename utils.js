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

// Drops shows that have already ended; calendar.json and the localStorage cache
// can lag behind the real calendar.
function upcomingShows(shows) {
  var now = Date.now();
  return shows.filter(function (s) { return new Date(s.end || s.start).getTime() > now; });
}

// Visitor counter (Supabase RPC). The anon key is public by design; the database
// only exposes the counter functions to it. To move the counter to another
// project, change these two values (see supabase/README.md).
var COUNTER_CONFIG = {
  url:    'https://zezigpysakremuredzwj.supabase.co',
  key:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplemlncHlzYWtyZW11cmVkendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjkxMzAsImV4cCI6MjA5MzE0NTEzMH0.iH6DMmKH5e28TpnIezvyqn06m7LPyJGmB3bZLHi6Z0s',
  pageId: 'me-site',
};

function loadVisitCount(textEl, wrapperEl) {
  if (!textEl) return;
  var seen = false;
  try { seen = !!sessionStorage.getItem('gsp_me_counted'); } catch (_) { /* storage blocked */ }
  var fn = seen ? 'get_page_views' : 'increment_page_views_for';
  fetch(COUNTER_CONFIG.url + '/rest/v1/rpc/' + fn, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        COUNTER_CONFIG.key,
      'Authorization': 'Bearer ' + COUNTER_CONFIG.key,
    },
    body: JSON.stringify({ page_id: COUNTER_CONFIG.pageId }),
  })
    .then(function (r) { return r.json(); })
    .then(function (n) {
      if (typeof n !== 'number') return;
      textEl.textContent = n.toLocaleString() + ' visitor' + (n === 1 ? '' : 's');
      if (wrapperEl) wrapperEl.removeAttribute('hidden');
      if (!seen) { try { sessionStorage.setItem('gsp_me_counted', '1'); } catch (_) { /* ignore */ } }
    })
    .catch(function () {});
}
