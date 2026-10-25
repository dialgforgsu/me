# Supabase SQL

One-off SQL for the visitor counter's database. Run each file in the Supabase SQL editor.

| File | Run in | What it does |
|------|--------|--------------|
| `2026-10-25-harden-comments-and-counters.sql` | redgate-tools-dashboard | Hides `comments.token` from the public API, adds comment length limits and a throttle, pins `search_path` on the counter functions. Read the header first: the app that uses `comments` must select explicit columns and generate tokens client-side. |
| `2026-10-25-site-counter-own-project.sql` | the counter's new home | Creates the counter table and functions, exposed to anon only through the two functions. |

## Moving the counter

1. Run `2026-10-25-site-counter-own-project.sql` in the new project, with the current `me-site` count.
2. In `utils.js`, set `COUNTER_CONFIG.url` and `COUNTER_CONFIG.key` to the new project's URL and publishable (anon) key.
3. In every page's CSP `connect-src`, replace `https://zezigpysakremuredzwj.supabase.co` with the new project URL.
4. After deploying, remove the `me-site` row from the old project's `page_views`.
