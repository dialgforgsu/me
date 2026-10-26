# G-Su Paek — Personal Site

Source for [gsupaek.com](https://www.gsupaek.com). Actor, improviser, tech guy.

## Stack

| Layer | Tech |
|-------|------|
| Pages | Vanilla HTML/CSS/JS |
| Calendar | Google Calendar ICS → GitHub Actions cron → `calendar.json` |
| Hot Pot videos | YouTube Data API (or RSS fallback) → GitHub Actions cron → `hotpot.json` |
| Contact form | Formspree |
| Visitor counter | Supabase (anonymous page-view RPC) |
| Hosting | GitHub Pages |

## Calendar sync

A GitHub Actions workflow runs every 15 minutes, fetches the private Google Calendar ICS, expands recurring events, and commits the top 5 upcoming shows to `calendar.json` only when a show changed. The same job refreshes `hotpot.json` from the Hot Pot Comedy uploads, using the YouTube Data API when the `YOUTUBE_API_KEY` secret is set and the channel's RSS feed otherwise.

Everything on that calendar (titles, venues, descriptions) for the next 5 events is published, so keep it shows-only.

The browser loads shows via a 2-tier fallback: localStorage cache (15-min TTL) → `calendar.json`. The private ICS URL itself is never sent to the browser — it lives only in the `CALENDAR_ICS_URL` GitHub Actions secret / server-side `.env`.

## Security notes

- Every page sets a Content-Security-Policy `<meta>` as the first tag in `<head>`; there are no inline scripts (Google Analytics bootstraps from `analytics.js`).
- GitHub Pages can't set response headers, so `_headers` only applies if the site moves to Cloudflare Pages or Netlify.
- Supabase SQL for the visitor counter lives in `supabase/`.
