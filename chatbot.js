/* ============================================
   G-SU PAEK — Chatbot (chatbot.js)
   Privacy-first: no conversations stored,
   no analytics on chat content, no PII logged.
   ============================================ */

(function () {
  'use strict';

  // ── Knowledge Base ──────────────────────────────────────
  var KB = {
    bio: [
      "G-Su Paek is an actor and improviser whose presence commands any room — whether it's a packed theater, a film set, or a stage lit by nothing but a single spotlight and pure instinct.",
      "With a background spanning long-form improv, sketch comedy, and dramatic performance, G-Su brings a fearless blend of vulnerability, wit, and raw energy to every role.",
      "His work lives in the space where truth meets absurdity — and that's exactly where the best stuff happens. Based in Austin, TX, G-Su performs regularly with some of the best troupes in the city and continues to build a body of work on screen that is as unpredictable as it is compelling.",
    ],
    films: [
      { year: 2022, title: 'Lucky Doug',                 type: 'Film',      url: 'https://www.imdb.com/title/tt12624120/' },
      { year: 2021, title: 'Night on Sixth',             type: 'Film',      url: 'https://www.imdb.com/title/tt14727478/' },
      { year: 2018, title: 'Call Me Brother',            type: 'Film',      url: 'https://www.imdb.com/title/tt6279022/'  },
      { year: 2018, title: 'Segs',                       type: 'TV Series', url: 'https://www.imdb.com/title/tt5871386/'  },
      { year: 2016, title: 'Crunch Time',                type: 'TV Series', url: 'https://www.imdb.com/title/tt5490630/'  },
      { year: 2015, title: '7 Chinese Brothers',         type: 'Film',      url: 'https://www.imdb.com/title/tt3488184/'  },
      { year: 2012, title: 'Somebody Up There Likes Me', type: 'Film',      url: 'https://www.imdb.com/title/tt2014346/'  },
    ],
    socials: [
      { name: 'Instagram',   handle: '@gsu.paek',    url: 'https://www.instagram.com/gsu.paek/'  },
      { name: 'YouTube',     handle: '@dialgforgsu', url: 'https://www.youtube.com/@dialgforgsu' },
      { name: 'X / Twitter', handle: '@dialgforgsu', url: 'https://x.com/dialgforgsu'            },
      { name: 'LinkedIn',    handle: 'G-Su Paek',    url: 'https://www.linkedin.com/in/gsupaek/'},
      { name: 'GitHub',      handle: '@dialgforgsu', url: 'https://github.com/dialgforgsu'      },
    ],
  };

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(isoStr) {
    var d    = new Date(isoStr);
    var day  = DAYS[d.getDay()];
    var mon  = MONTHS[d.getMonth()];
    var date = d.getDate();
    var time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return day + ', ' + mon + ' ' + date + ' at ' + time;
  }

  // ── Shows (reads from script.js localStorage cache or calendar.json) ──
  function getShows() {
    try {
      var cached = JSON.parse(localStorage.getItem('gsupaek_shows_v3') || 'null');
      if (cached && Array.isArray(cached.shows) && cached.shows.length) {
        return Promise.resolve(cached.shows);
      }
    } catch (e) {}
    return fetch('calendar.json?_=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return (d && Array.isArray(d.shows)) ? d.shows : []; })
      .catch(function () { return []; });
  }

  // ── State ───────────────────────────────────────────────
  var isOpen      = false;
  var hasGreeted  = false;
  var cachedShows = null;

  // ── DOM refs (populated in buildDOM) ───────────────────
  var toggleEl, windowEl, messagesEl, inputEl, sendBtnEl,
      menuBtnEl, formPanelEl, formBackEl, badgeEl;

  // ── Build DOM ───────────────────────────────────────────
  function buildDOM() {
    var root = document.createElement('div');
    root.className = 'chatbot';
    root.id        = 'chatbot';
    root.innerHTML =
      '<button class="chatbot__toggle" id="chatbotToggle" aria-label="Chat with G-Su\'s assistant" aria-expanded="false">' +
        '<svg class="chatbot__toggle-icon chatbot__toggle-icon--chat" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<svg class="chatbot__toggle-icon chatbot__toggle-icon--close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '<span class="chatbot__badge" id="chatbotBadge" aria-hidden="true">1</span>' +
      '</button>' +

      '<div class="chatbot__window" id="chatbotWindow" role="dialog" aria-label="Chat with G-Su\'s assistant" aria-hidden="true">' +
        '<div class="chatbot__header">' +
          '<div class="chatbot__avatar" aria-hidden="true">GS</div>' +
          '<div class="chatbot__header-info">' +
            '<span class="chatbot__name">G-Su\'s Assistant</span>' +
            '<span class="chatbot__status"><span class="chatbot__status-dot" aria-hidden="true"></span>Online</span>' +
          '</div>' +
          '<button class="chatbot__close" id="chatbotClose" aria-label="Close chat">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +

        '<div class="chatbot__messages" id="chatbotMessages" aria-live="polite" aria-atomic="false"></div>' +

        '<div class="chatbot__form-panel" id="chatbotFormPanel" aria-hidden="true">' +
          '<div class="chatbot__form-header">' +
            '<span>Send G-Su a Message</span>' +
            '<button class="chatbot__form-back" id="chatbotFormBack" aria-label="Back to chat">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
              'Back' +
            '</button>' +
          '</div>' +
          '<form class="chatbot__form" id="chatbotContactForm" novalidate>' +
            '<div class="chatbot__form-group">' +
              '<label class="chatbot__form-label" for="cb_name">Name</label>' +
              '<input class="chatbot__form-input" type="text" id="cb_name" name="name" placeholder="Your Name" required autocomplete="name" />' +
            '</div>' +
            '<div class="chatbot__form-group">' +
              '<label class="chatbot__form-label" for="cb_email">Email</label>' +
              '<input class="chatbot__form-input" type="email" id="cb_email" name="email" placeholder="your@email.com" required autocomplete="email" />' +
            '</div>' +
            '<div class="chatbot__form-group">' +
              '<label class="chatbot__form-label" for="cb_subject">Subject</label>' +
              '<select class="chatbot__form-input chatbot__form-select" id="cb_subject" name="subject">' +
                '<option value="">Select a subject</option>' +
                '<option value="booking">Booking / Casting</option>' +
                '<option value="press">Press / Media</option>' +
                '<option value="workshop">Coaching / Workshop</option>' +
                '<option value="other">General / Other</option>' +
              '</select>' +
            '</div>' +
            '<div class="chatbot__form-group">' +
              '<label class="chatbot__form-label" for="cb_message">Message</label>' +
              '<textarea class="chatbot__form-input chatbot__form-textarea" id="cb_message" name="message" placeholder="What\'s on your mind?" required></textarea>' +
            '</div>' +
            '<button type="submit" class="chatbot__form-submit" id="chatbotFormSubmit">Send Message</button>' +
          '</form>' +
        '</div>' +

        '<div class="chatbot__footer">' +
          '<button class="chatbot__menu-btn" id="chatbotMenuBtn" aria-label="Return to main menu">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
            'Main Menu' +
          '</button>' +
          '<div class="chatbot__input-row">' +
            '<input type="text" class="chatbot__input" id="chatbotInput" placeholder="Ask me anything…" aria-label="Type your message" autocomplete="off" maxlength="400" />' +
            '<button class="chatbot__send" id="chatbotSend" aria-label="Send message">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
            '</button>' +
          '</div>' +
          '<p class="chatbot__privacy">Your conversations are never stored or tracked.</p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    toggleEl   = document.getElementById('chatbotToggle');
    windowEl   = document.getElementById('chatbotWindow');
    messagesEl = document.getElementById('chatbotMessages');
    inputEl    = document.getElementById('chatbotInput');
    sendBtnEl  = document.getElementById('chatbotSend');
    menuBtnEl  = document.getElementById('chatbotMenuBtn');
    formPanelEl = document.getElementById('chatbotFormPanel');
    formBackEl  = document.getElementById('chatbotFormBack');
    badgeEl     = document.getElementById('chatbotBadge');
  }

  // ── Message Helpers ─────────────────────────────────────
  function addBotMsg(html, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'chatbot__msg chatbot__msg--bot';

    if (opts.typing) {
      wrap.innerHTML =
        '<div class="chatbot__bubble chatbot__bubble--typing">' +
          '<span></span><span></span><span></span>' +
        '</div>';
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (html) {
            wrap.innerHTML = '<div class="chatbot__bubble">' + html + '</div>';
          } else {
            wrap.innerHTML = '';
          }
          if (opts.quickReplies) wrap.appendChild(buildQuickReplies(opts.quickReplies));
          messagesEl.scrollTop = messagesEl.scrollHeight;
          resolve();
        }, opts.delay !== undefined ? opts.delay : 700);
      });
    }

    if (html) wrap.innerHTML = '<div class="chatbot__bubble">' + html + '</div>';
    if (opts.quickReplies) wrap.appendChild(buildQuickReplies(opts.quickReplies));
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return Promise.resolve();
  }

  function addUserMsg(text) {
    var wrap = document.createElement('div');
    wrap.className = 'chatbot__msg chatbot__msg--user';
    wrap.innerHTML = '<div class="chatbot__bubble chatbot__bubble--user">' + escHtml(text) + '</div>';
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function buildQuickReplies(replies) {
    var row = document.createElement('div');
    row.className = 'chatbot__quick-replies';
    replies.forEach(function (r) {
      var btn = document.createElement('button');
      btn.className   = 'chatbot__qr-btn';
      btn.textContent = r.label;
      btn.addEventListener('click', function () {
        clearQuickReplies();
        handleAction(r.action);
      });
      row.appendChild(btn);
    });
    return row;
  }

  function clearQuickReplies() {
    messagesEl.querySelectorAll('.chatbot__quick-replies').forEach(function (el) {
      el.remove();
    });
  }

  // ── Main Menu ───────────────────────────────────────────
  var MAIN_MENU = [
    { label: '👤 About G-Su',     action: 'bio'      },
    { label: '🎬 Films & TV',     action: 'films'    },
    { label: '🎭 Upcoming Shows', action: 'shows'    },
    { label: '🎓 Coaching',       action: 'coaching' },
    { label: '📱 Social Media',   action: 'socials'  },
    { label: '✉️ Send a Message', action: 'contact'  },
  ];

  function showMainMenu() {
    return addBotMsg('What would you like to know?', {
      typing: true, delay: 380, quickReplies: MAIN_MENU
    });
  }

  // ── Action Handlers ─────────────────────────────────────
  function handleAction(action) {
    hideFormPanel();
    clearQuickReplies();
    switch (action) {
      case 'greeting':   return doGreeting();
      case 'bio':        return doBio();
      case 'films':      return doFilms();
      case 'shows':      return doShows();
      case 'directions': return doDirections();
      case 'coaching':   return doCoaching();
      case 'socials':    return doSocials();
      case 'contact':    return doContact();
      case 'press':      return doPress();
      case 'menu':       return showMainMenu();
      default:           return doFallback();
    }
  }

  function doGreeting() {
    return addBotMsg("Hey! Great to have you here. 👋", { typing: true, delay: 500 })
      .then(showMainMenu);
  }

  function doBio() {
    var html = KB.bio.map(function (p) { return '<p>' + escHtml(p) + '</p>'; }).join('');
    return addBotMsg(html, { typing: true, delay: 900 })
      .then(function () {
        return addBotMsg(
          '<a href="#about" class="chatbot__link">Read the full about section ↗</a>',
          { quickReplies: [{ label: '⬅ Main Menu', action: 'menu' }] }
        );
      });
  }

  function doFilms() {
    var rows = KB.films.map(function (f) {
      return '<div class="chatbot__film-row">' +
        '<span class="chatbot__film-year">' + f.year + '</span>' +
        '<span class="chatbot__film-title"><a href="' + escHtml(f.url) + '" target="_blank" rel="noopener noreferrer" class="chatbot__link">' + escHtml(f.title) + '</a></span>' +
        '<span class="chatbot__film-type">' + escHtml(f.type) + '</span>' +
      '</div>';
    }).join('');
    return addBotMsg(
      '<p><strong>G-Su\'s Film &amp; TV Credits:</strong></p><div class="chatbot__film-list">' + rows + '</div>',
      { typing: true, delay: 750 }
    ).then(function () {
      return addBotMsg(
        '<a href="G-SuPaekActingResume.pdf" target="_blank" rel="noopener" class="chatbot__link">↓ Download full acting resume</a>',
        { quickReplies: [{ label: '⬅ Main Menu', action: 'menu' }] }
      );
    });
  }

  function doShows() {
    return addBotMsg('Checking the calendar…', { typing: true, delay: 500 })
      .then(function () {
        return (cachedShows ? Promise.resolve(cachedShows) : getShows());
      })
      .then(function (shows) {
        cachedShows = shows;
        if (!shows || !shows.length) {
          return addBotMsg(
            'No upcoming shows are on the calendar right now — check back soon! ' +
            'Follow G-Su on Instagram <a href="https://www.instagram.com/gsu.paek/" target="_blank" rel="noopener" class="chatbot__link">@gsu.paek</a> for the latest.',
            { quickReplies: [
              { label: '📍 Get Directions', action: 'directions' },
              { label: '⬅ Main Menu',             action: 'menu'       },
            ]}
          );
        }

        var next = shows[0];
        var html =
          '<p><strong>Next up:</strong></p>' +
          '<div class="chatbot__show-card">' +
            '<div class="chatbot__show-title">' + escHtml(next.title) + '</div>' +
            '<div class="chatbot__show-meta">📅 ' + fmtDate(next.start) + '</div>' +
            (next.location ? '<div class="chatbot__show-meta">📍 ' + escHtml(next.location) + '</div>' : '') +
          '</div>';

        if (shows.length > 1) {
          html += '<p style="margin-top:10px"><strong>Also coming up:</strong></p>';
          shows.slice(1, 4).forEach(function (s) {
            html +=
              '<div class="chatbot__show-mini">' +
                '<span class="chatbot__show-mini-title">' + escHtml(s.title) + '</span>' +
                '<span class="chatbot__show-mini-date">' + fmtDate(s.start) + '</span>' +
              '</div>';
          });
        }

        var qr = [
          { label: '📍 Get Directions', action: 'directions' },
          { label: '⬅ Main Menu',       action: 'menu'       },
        ];

        return addBotMsg(html, { typing: true, delay: 800 })
          .then(function () { return addBotMsg('', { quickReplies: qr }); });
      });
  }

  function doCoaching() {
    var ratesHtml =
      '<p style="margin-bottom:12px"><strong>Improv Coaching — Group Rates:</strong></p>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(255,60,0,0.12);border-left:3px solid #ff3c00">' +
          '<span style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">In Person</span>' +
          '<span><strong style="font-size:20px">$10</strong><span style="font-size:11px;opacity:.5;margin-left:4px">/ person / hr</span></span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(255,255,255,0.04);border-left:3px solid rgba(255,255,255,0.2)">' +
          '<span style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">Virtual</span>' +
          '<span><strong style="font-size:20px">$5</strong><span style="font-size:11px;opacity:.5;margin-left:4px">/ person / hr</span></span>' +
        '</div>' +
      '</div>';

    return addBotMsg(ratesHtml, { typing: true, delay: 700 })
      .then(function () {
        return addBotMsg(
          '<p>Group rate — price scales per person and session length. ' +
          'Open to long-term pricing for dedicated troupes.</p>' +
          '<a href="coaching.html" target="_blank" rel="noopener" class="chatbot__link">Try the session cost calculator ↗</a>',
          {
            quickReplies: [
              { label: '✉️ Book a Session', action: 'contact' },
              { label: '⬅ Main Menu',       action: 'menu'    },
            ]
          }
        );
      });
  }

  function doDirections() {
    var shows = cachedShows;
    return (shows ? Promise.resolve(shows) : getShows()).then(function (s) {
      cachedShows = s;
      var location = (s && s[0] && s[0].location) ? s[0].location : '';
      var venue    = location || 'Fallout Theater, 616 Lavaca St, Austin, TX 78701';
      var label    = location ? escHtml(location) : 'Fallout Theater — 616 Lavaca St, Austin, TX';
      var mapsUrl  = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue);

      var html =
        (location
          ? '<p>The next show is at:</p><p><strong>' + label + '</strong></p>'
          : '<p>G-Su performs regularly at <strong>Fallout Theater</strong> in Austin, TX.</p>'
        ) +
        '<br><a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" class="chatbot__btn">📍 Open in Google Maps</a>';

      return addBotMsg(html, {
        typing: true, delay: 600,
        quickReplies: [
          { label: '🎭 See All Shows', action: 'shows' },
          { label: '⬅ Main Menu',            action: 'menu'  },
        ]
      });
    });
  }

  function doSocials() {
    var links = KB.socials.map(function (s) {
      return '<a href="' + escHtml(s.url) + '" target="_blank" rel="noopener noreferrer" class="chatbot__social-link">' +
        '<span class="chatbot__social-name">' + escHtml(s.name) + '</span>' +
        '<span class="chatbot__social-handle">' + escHtml(s.handle) + '</span>' +
      '</a>';
    }).join('');
    return addBotMsg(
      '<p><strong>Find G-Su online:</strong></p><div class="chatbot__social-list">' + links + '</div>',
      { typing: true, delay: 600, quickReplies: [{ label: '⬅ Main Menu', action: 'menu' }] }
    );
  }

  function doContact() {
    return addBotMsg(
      'Want to reach G-Su directly? Fill out the form below — for bookings, press, coaching, or just to say hey!',
      { typing: true, delay: 500 }
    ).then(function () {
      setTimeout(showFormPanel, 250);
    });
  }

  function doPress() {
    var html =
      '<p><strong>G-Su has been featured in:</strong></p>' +
      '<ul class="chatbot__press-list">' +
        '<li><a href="https://deadline.com/2020/01/cbs-sets-cast-2020-comedy-showcase-1202820881/" target="_blank" rel="noopener" class="chatbot__link">Deadline — CBS Comedy Showcase (2020)</a></li>' +
        '<li><a href="https://boldjourney.com/meet-g-su-paek/" target="_blank" rel="noopener" class="chatbot__link">Bold Journey — Meet G-Su Paek</a></li>' +
        '<li><a href="G-SuPaekActingResume.pdf" target="_blank" rel="noopener" class="chatbot__link">↓ Download Acting Resume</a></li>' +
      '</ul>';
    return addBotMsg(html, {
      typing: true, delay: 600,
      quickReplies: [{ label: '⬅ Main Menu', action: 'menu' }]
    });
  }

  function doFallback() {
    var opts = [
      "I'm not sure about that one! Here's what I can help with:",
      "Great question — let me show you what I know:",
      "That's outside my knowledge base, but I can help with these:",
    ];
    var msg = opts[Math.floor(Math.random() * opts.length)];
    return addBotMsg(msg, { typing: true, delay: 500 }).then(showMainMenu);
  }

  // ── Intent Detection ────────────────────────────────────
  var INTENTS = [
    { re: /\b(hi|hello|hey|howdy|yo|sup|what'?s up|greet)\b/i,                               action: 'greeting'   },
    { re: /\b(bio|about|who (is|are)|background|story|tell me|describe|person)\b/i,           action: 'bio'        },
    { re: /\b(film|movie|tv|television|series|credit|imdb|cast|act|screen|role|appear)\b/i,   action: 'films'      },
    { re: /\b(upcoming|next show|perform|improv|troupe|gig|event|calendar|schedule|when)\b/i, action: 'shows'      },
    { re: /\b(direction|where is|how (do i|to) get|map|venue|address|location|get there)\b/i, action: 'directions' },
    { re: /\b(coach|coaching|lesson|teach|rate|fee|price|cost|how much|calculator)\b/i,       action: 'coaching'   },
    { re: /\b(social|instagram|twitter|youtube|linkedin|github|follow|@)\b/i,                  action: 'socials'    },
    { re: /\b(contact|message|email|send|reach|booking|book|press|inquir|workshop)\b/i,       action: 'contact'    },
    { re: /\b(press|feature|deadline|bold journey|cbs|showcase|article)\b/i,                  action: 'press'      },
    { re: /\b(menu|back|home|main|start|option|help|what can you)\b/i,                        action: 'menu'       },
  ];

  function detectIntent(text) {
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].re.test(text)) return INTENTS[i].action;
    }
    return 'fallback';
  }

  // ── Form Panel ──────────────────────────────────────────
  function showFormPanel() {
    formPanelEl.classList.add('chatbot__form-panel--open');
    formPanelEl.setAttribute('aria-hidden', 'false');
    var firstInput = formPanelEl.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }

  function hideFormPanel() {
    formPanelEl.classList.remove('chatbot__form-panel--open');
    formPanelEl.setAttribute('aria-hidden', 'true');
  }

  // ── Open / Close ────────────────────────────────────────
  function openChat() {
    isOpen = true;
    windowEl.classList.add('chatbot__window--open');
    windowEl.setAttribute('aria-hidden', 'false');
    toggleEl.setAttribute('aria-expanded', 'true');
    toggleEl.classList.add('chatbot__toggle--open');
    badgeEl.classList.add('chatbot__badge--hidden');

    if (!hasGreeted) {
      hasGreeted = true;
      setTimeout(function () {
        addBotMsg(
          'Hey! I\'m G-Su\'s assistant. Ask me about his bio, films, upcoming shows, directions, socials, or send him a message directly.',
          { typing: true, delay: 900 }
        ).then(showMainMenu);
      }, 150);
    }
    setTimeout(function () { inputEl.focus(); }, 350);
  }

  function closeChat() {
    isOpen = false;
    windowEl.classList.remove('chatbot__window--open');
    windowEl.setAttribute('aria-hidden', 'true');
    toggleEl.setAttribute('aria-expanded', 'false');
    toggleEl.classList.remove('chatbot__toggle--open');
    hideFormPanel();
  }

  // ── Input ───────────────────────────────────────────────
  function handleInput() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    hideFormPanel();
    clearQuickReplies();
    addUserMsg(text);
    var action = detectIntent(text);
    handleAction(action);
  }

  // ── Contact Form Submit ─────────────────────────────────
  function bindContactForm() {
    var form = document.getElementById('chatbotContactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn  = document.getElementById('chatbotFormSubmit');
      var orig = btn.textContent;
      btn.textContent = 'Sending…';
      btn.disabled    = true;

      var payload = {
        name:    form.cb_name.value.trim(),
        email:   form.cb_email.value.trim(),
        subject: form.cb_subject.value,
        message: form.cb_message.value.trim(),
      };

      fetch('https://formspree.io/f/mgorqnqy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(payload),
      })
      .then(function (r) {
        if (!r.ok) throw new Error('fail');
        btn.textContent = 'Message Sent!';
        btn.classList.add('chatbot__form-submit--success');
        form.reset();
        setTimeout(function () {
          hideFormPanel();
          addBotMsg(
            'Your message was sent 🎉 G-Su will get back to you soon!',
            { quickReplies: [{ label: '⬅ Main Menu', action: 'menu' }] }
          );
          btn.textContent = orig;
          btn.classList.remove('chatbot__form-submit--success');
          btn.disabled = false;
        }, 2000);
      })
      .catch(function () {
        btn.textContent = 'Something went wrong — try again';
        btn.classList.add('chatbot__form-submit--error');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('chatbot__form-submit--error');
          btn.disabled = false;
        }, 3000);
      });
    });
  }

  // ── Init ────────────────────────────────────────────────
  function init() {
    buildDOM();

    toggleEl.addEventListener('click', function () { isOpen ? closeChat() : openChat(); });
    document.getElementById('chatbotClose').addEventListener('click', closeChat);

    menuBtnEl.addEventListener('click', function () {
      hideFormPanel();
      clearQuickReplies();
      showMainMenu();
    });

    sendBtnEl.addEventListener('click', handleInput);
    inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleInput(); });
    formBackEl.addEventListener('click', hideFormPanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeChat();
    });

    bindContactForm();

    // Pre-warm the shows cache
    getShows().then(function (s) { cachedShows = s; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
