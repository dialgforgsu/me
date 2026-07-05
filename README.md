# G-Su Paek — Personal Site

Source for [gsupaek.com](https://gsupaek.com). Actor, improviser, tech guy.

## Stack

| Layer | Tech |
|-------|------|
| Pages | Vanilla HTML/CSS/JS |
| Calendar | Google Calendar ICS → GitHub Actions cron → `calendar.json` |
| Contact form | Formspree |
| Visitor counter | Supabase (anonymous page-view RPC) |
| Hosting | GitHub Pages |

## Calendar sync

A GitHub Actions workflow runs every 15 minutes, fetches the private Google Calendar ICS, expands recurring events, and commits the top 5 upcoming shows to `calendar.json` if anything changed.

The browser loads shows via a 2-tier fallback: localStorage cache (15-min TTL) → `calendar.json`. The private ICS URL itself is never sent to the browser — it lives only in the `CALENDAR_ICS_URL` GitHub Actions secret / server-side `.env`.
