# G-Su Paek — Personal Site

Actor, improviser, and occasional builder of things. Source for [gsupaek.com](https://gsupaek.com).

## Stack

| Layer | Tech |
|-------|------|
| Pages | Vanilla HTML/CSS/JS — no framework |
| Backend | Node.js + Express (`/api/contact`, `/api/shows`) |
| Persistence | SQLite (`contacts.db`) — contact form submissions |
| Calendar | Google Calendar ICS → GitHub Actions cron → `calendar.json` |
| Analytics | Supabase — visitor counter via RPC |
| Hosting | GitHub Pages (static) + optional Node server |

## Project Structure

```
me/
├── index.html              # Main portfolio page
├── hotpot.html             # Hot Pot Comedy sketch troupe page
├── tech.html               # Developer/tech profile page
├── script.js               # Client-side logic for index.html (YouTube, shows, contact)
├── page.js                 # Shared client-side logic for hotpot.html + tech.html
├── hotpot.js               # YouTube RSS video gallery (hotpot.html only)
├── styles.css              # All styles — CSS custom properties, dark/light theme
├── server.js               # Express server: POST /api/contact, GET /api/shows
├── update-calendar.js      # Calendar sync script → writes calendar.json + calendar.md
├── calendar.json           # Cached upcoming shows (auto-committed by GH Actions)
├── calendar.md             # Human-readable show schedule
├── images/                 # Portfolio assets (headshots, logos, backgrounds)
├── G-SuPaekActingResume.pdf
└── .github/workflows/
    └── update-calendar.yml # Cron — runs every 15 min, commits if shows changed
```

## Local Development

```bash
npm install
cp .env.example .env   # fill in SMTP_USER, SMTP_PASS, CALENDAR_ICS_URL
npm run dev            # Express server on http://localhost:3000 with auto-reload
```

For a static-only preview (no contact form or live calendar API):

```bash
npx serve .
# or just open index.html directly in a browser
```

## Environment Variables

Copy `.env.example` → `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_USER` | For email alerts | Gmail address that sends contact notifications |
| `SMTP_PASS` | For email alerts | [Gmail App Password](https://myaccount.google.com/apppasswords) — 16 chars, not your account password |
| `CALENDAR_ICS_URL` | For `/api/shows` | Private ICS URL from Google Calendar settings — grants read access, keep secret |
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | No | Set to `production` to enable HTTPS redirect middleware |

> The Supabase URL and anon key in `script.js` / `page.js` are **intentionally public** — the anon key is designed for client-side use and access is enforced by Supabase Row Level Security (RLS), not by key secrecy.

## Scripts

```bash
npm start          # production server
npm run dev        # dev server with nodemon
npm run lint       # ESLint
npm run format     # Prettier (writes in-place)
npm run build      # refresh calendar.json from Google Calendar
npm test           # placeholder (no tests yet)
```

## Calendar Sync Flow

Shows data travels from Google Calendar → static JSON → browser via a 3-tier fallback:

```
Google Calendar (private ICS URL in CALENDAR_ICS_URL)
        │
        ▼  every 15 min — .github/workflows/update-calendar.yml
update-calendar.js
  · fetches ICS, expands recurring events with ical-expander
  · top 5 upcoming events → calendar.json + calendar.md
  · git commit only if content changed ("chore: update calendar cache")
        │
        ▼
calendar.json  (committed to repo, served as a static file)
        │
        ▼  browser — script.js, 3-tier fallback
        1. localStorage cache (15-min TTL, avoids redundant fetches)
        2. fetch /calendar.json  ← primary path
        3. CORS proxy → raw ICS (api.allorigins.win) → parsed with ical.js CDN
```

The Node server's `GET /api/shows` provides the same data with a 5-minute in-memory cache when running locally.

## Supabase Schema

The visitor counter uses two RPC functions in a Supabase project:

```sql
-- Stores per-page view counts
CREATE TABLE page_views (
  page_id TEXT   PRIMARY KEY,
  count   BIGINT NOT NULL DEFAULT 0
);

-- Called on page load (increments or reads depending on session state)
CREATE OR REPLACE FUNCTION increment_page_views_for(page_id TEXT)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE new_count BIGINT;
BEGIN
  INSERT INTO page_views (page_id, count) VALUES (page_id, 1)
  ON CONFLICT (page_id) DO UPDATE SET count = page_views.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_page_views(page_id TEXT)
RETURNS BIGINT LANGUAGE sql AS $$
  SELECT COALESCE(count, 0) FROM page_views WHERE page_id = $1;
$$;
```

`sessionStorage` deduplication prevents double-counting within a single browser session.

## SQLite Schema

Contact form submissions are stored locally in `contacts.db` (not committed):

```sql
CREATE TABLE contacts (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  name         TEXT     NOT NULL,
  email        TEXT     NOT NULL,
  subject      TEXT,
  message      TEXT     NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Each submission also triggers an email notification via Nodemailer (Gmail SMTP).
