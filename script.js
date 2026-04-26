/* ============================================
   G-SU PAEK — script.js
   ============================================ */

// YouTube IFrame API — reel section autoplay on scroll
;(function () {
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(tag, firstScript);
})();

var reelPlayer;

window.onYouTubeIframeAPIReady = function () {
  reelPlayer = new YT.Player('reelPlayer', {
    videoId: 'A4serB8kRZU',
    playerVars: {
      autoplay: 0,
      mute: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      enablejsapi: 1,
    },
    events: {
      onReady: function (e) {
        e.target.mute();
        var reelSection = document.getElementById('reel');
        if (!reelSection) return;
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              e.target.playVideo();
            } else {
              e.target.pauseVideo();
            }
          });
        }, { threshold: 0.5 }).observe(reelSection);
      }
    }
  });
};

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
  nav.classList.toggle('menu-open', open);
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
    nav.classList.remove('menu-open');
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

// Visitor counter
(function () {
  const countEl = document.getElementById('visitorCount');
  if (!countEl) return;

  const STORAGE_KEY = 'gsupaek_visited';
  const alreadyCounted = sessionStorage.getItem(STORAGE_KEY);

  const endpoint = alreadyCounted
    ? 'https://api.counterapi.dev/v1/gsupaek-site/visits'
    : 'https://api.counterapi.dev/v1/gsupaek-site/visits/up';

  fetch(endpoint)
    .then(r => r.json())
    .then(data => {
      const val = data && (data.count ?? data.value);
      if (val != null) {
        countEl.textContent = Number(val).toLocaleString();
        sessionStorage.setItem(STORAGE_KEY, '1');
      }
    })
    .catch(() => {
      countEl.textContent = '—';
    });
})();

// Newsletter signup form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', e => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input');
    const btn   = newsletterForm.querySelector('button');
    btn.textContent = "You're on the list!";
    btn.style.background = '#2ecc71';
    btn.style.borderColor = '#2ecc71';
    input.disabled = true;
    btn.disabled = true;
    localStorage.setItem('gsupaek_newsletter', input.value);
  });
  // Restore if already subscribed
  if (localStorage.getItem('gsupaek_newsletter')) {
    const input = newsletterForm.querySelector('input');
    const btn   = newsletterForm.querySelector('button');
    input.value = localStorage.getItem('gsupaek_newsletter');
    input.disabled = true;
    btn.textContent = "You're on the list!";
    btn.disabled = true;
  }
}

// Contact form — tries server, falls back to mailto (no Gmail config needed)
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn      = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const subject = form.subject.value;
    const message = form.message.value.trim();

    // Try server; if unavailable, open mailto as fallback
    let serverOk = false;
    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, subject, message }),
      });
      if (res.ok) serverOk = true;
    } catch (_) {}

    if (!serverOk) {
      const sub  = encodeURIComponent(`[Contact] ${subject || 'Message'} — ${name}`);
      const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
      window.open(`mailto:gsu.paek@gmail.com?subject=${sub}&body=${body}`);
    }

    btn.textContent   = 'Message Sent!';
    btn.style.cssText = 'background:#2ecc71;border-color:#2ecc71;color:#fff';
    form.reset();
    setTimeout(() => { btn.style.cssText = ''; btn.textContent = original; btn.disabled = false; }, 3000);
  });
}

// Upcoming shows — tries server API first, falls back to direct ICS parse via CORS proxy
const _ICS_URL = 'https://calendar.google.com/calendar/ical/4973b08352caa62ecc8fe9e9106a62786587da67d9774285d39c27911754213e%40group.calendar.google.com/private-d8a8ffc18a5c2610ef33d0b0893d8e32/basic.ics';

function _parseICSShows(text) {
  const comp  = new ICAL.Component(ICAL.parse(text));
  const now   = ICAL.Time.now();
  const limit = now.clone();
  limit.addDuration(ICAL.Duration.fromSeconds(180 * 24 * 3600));
  const results = [];

  for (const vevent of comp.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(vevent);
    if (ev.isRecurring()) {
      const iter = ev.iterator();
      let next, count = 0;
      while (count < 30 && (next = iter.next()) && next.compare(limit) <= 0) {
        count++;
        if (next.compare(now) < 0) continue;
        const det = ev.getOccurrenceDetails(next);
        results.push({
          title:       ev.summary || '',
          start:       next.toJSDate().toISOString(),
          end:         det.endDate ? det.endDate.toJSDate().toISOString() : null,
          location:    vevent.getFirstPropertyValue('location') || '',
          description: vevent.getFirstPropertyValue('description') || '',
          url:         vevent.getFirstPropertyValue('url') || '',
        });
      }
    } else {
      if (ev.startDate.compare(now) < 0) continue;
      results.push({
        title:       ev.summary || '',
        start:       ev.startDate.toJSDate().toISOString(),
        end:         ev.endDate ? ev.endDate.toJSDate().toISOString() : null,
        location:    vevent.getFirstPropertyValue('location') || '',
        description: vevent.getFirstPropertyValue('description') || '',
        url:         vevent.getFirstPropertyValue('url') || '',
      });
    }
  }
  return results.sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 5);
}

async function loadShows() {
  const container = document.getElementById('showsList');
  if (!container) return;

  container.innerHTML = '<p class="shows__loading">Loading shows…</p>';

  const MONTHS  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const CAL_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  function toGCalDate(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  const EVENTBRITE_URLS = [
    { match: /y.?all we asian/i,    url: 'https://www.eventbrite.com/e/yall-we-asian-hot-stories-hotter-comedy-tickets-162922468489' },
    { match: /teenage dirtbag/i,    url: 'https://www.eventbrite.com/e/teenage-dirtbag-nostalgia-fueled-improv-comedy-tickets-415633931277' },
  ];

  function resolveTicketUrl(show) {
    for (const rule of EVENTBRITE_URLS) {
      if (rule.match.test(show.title)) return rule.url;
    }
    if (show.url) return show.url;
    // Extract first URL from description (ticket links added in calendar event details)
    if (show.description) {
      const m = show.description.match(/https?:\/\/[^\s\n\\n<>"]+/);
      if (m) return m[0];
    }
    return '';
  }

  function renderShows(shows) {
    if (!shows.length) {
      container.innerHTML = '<p class="shows__empty">No upcoming shows. Check back soon!</p>';
      return;
    }
    container.innerHTML = shows.map(show => {
      const d         = new Date(show.start);
      const month     = MONTHS[d.getMonth()];
      const day       = d.getDate();
      const time      = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const endIso    = show.end || new Date(d.getTime() + 7200000).toISOString();
      const calUrl    = `https://calendar.google.com/calendar/render?action=TEMPLATE`
        + `&text=${encodeURIComponent(show.title)}`
        + `&dates=${toGCalDate(show.start)}/${toGCalDate(endIso)}`
        + `&location=${encodeURIComponent(show.location)}`
        + `&details=${encodeURIComponent(show.description)}`;
      const ticketUrl = resolveTicketUrl(show);
      const sub       = show.description ? show.description.split(/[\n\\n]/)[0] : '';
      return `<div class="show__card">
        <div class="show__card-date">
          <span class="show__month">${month}</span>
          <span class="show__day">${day}</span>
        </div>
        <div class="show__card-body">
          <h4 class="show__card-title">${show.title}</h4>
          ${sub ? `<p class="show__card-sub">${sub}</p>` : ''}
          ${show.location ? `<p class="show__card-meta">${show.location}</p>` : ''}
          <p class="show__card-meta">${time}</p>
          <div class="show__card-actions">
            ${ticketUrl ? `<a href="${ticketUrl}" target="_blank" rel="noopener" class="btn btn--primary btn--sm">Tickets</a>` : ''}
            <a href="${calUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm btn--cal" title="Add to Google Calendar">
              ${CAL_SVG} + Cal
            </a>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // Always fetch ICS directly via CORS proxy
  try {
    const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(_ICS_URL);
    const res   = await fetch(proxy);
    if (!res.ok) throw new Error('proxy');
    renderShows(_parseICSShows(await res.text()));
  } catch {
    container.innerHTML = '<p class="shows__empty">Unable to load shows — check back soon!</p>';
  }
}

loadShows();

document.getElementById('showsRefresh')?.addEventListener('click', function () {
  this.classList.add('spinning');
  loadShows().finally(() => this.classList.remove('spinning'));
});
