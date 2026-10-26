#!/usr/bin/env node
'use strict';

/**
 * update-calendar.js
 * Fetches the Google Calendar ICS, expands recurring events,
 * and writes calendar.json only when events change.
 *
 * Usage:   node update-calendar.js
 * GitHub Actions: runs on schedule via .github/workflows/update-calendar.yml
 */

require('dotenv').config();

const fetch        = require('node-fetch');
const IcalExpander = require('ical-expander');
const fs           = require('fs');
const path         = require('path');

const ICS_URL       = process.env.CALENDAR_ICS_URL;
const CALENDAR_JSON = path.join(__dirname, 'calendar.json');
const LOOKAHEAD_MS  = 365 * 24 * 3600 * 1000; // 1 year
const MAX_SHOWS     = 5;

// ── Parse ─────────────────────────────────────────────────────────────────────

function parseICS(text) {
  const now   = new Date();
  const limit = new Date(now.getTime() + LOOKAHEAD_MS);

  const expander = new IcalExpander({ ics: text, maxIterations: 500 });
  const { events, occurrences } = expander.between(now, limit);

  const shows = [];

  for (const ev of events) {
    shows.push({
      title:       ev.summary || '',
      start:       ev.startDate.toJSDate().toISOString(),
      end:         ev.endDate ? ev.endDate.toJSDate().toISOString() : null,
      location:    ev.component.getFirstPropertyValue('location')    || '',
      description: ev.component.getFirstPropertyValue('description') || '',
      url:         ev.component.getFirstPropertyValue('url')         || '',
    });
  }

  for (const occ of occurrences) {
    shows.push({
      title:       occ.item.summary || '',
      start:       occ.startDate.toJSDate().toISOString(),
      end:         occ.endDate ? occ.endDate.toJSDate().toISOString() : null,
      location:    occ.item.component.getFirstPropertyValue('location')    || '',
      description: occ.item.component.getFirstPropertyValue('description') || '',
      url:         occ.item.component.getFirstPropertyValue('url')         || '',
    });
  }

  return shows
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, MAX_SHOWS);
}

// ── Diff ──────────────────────────────────────────────────────────────────────

// Compares every published field, so venue/time/link edits are picked up too.
function hasChanges(existing, fresh) {
  return JSON.stringify(existing) !== JSON.stringify(fresh);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ICS_URL) {
    console.error('[calendar] CALENDAR_ICS_URL is not set (env var or GitHub Actions secret).');
    process.exit(1);
  }

  let existing = { updated: null, shows: [] };
  try { existing = JSON.parse(fs.readFileSync(CALENDAR_JSON, 'utf8')); } catch {}

  console.log('[calendar] Fetching ICS…');
  let icsText;
  try {
    const res = await fetch(ICS_URL, { headers: { 'User-Agent': 'gsupaek-calendar-updater/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (err) {
    console.error('[calendar] Fetch failed:', err.message);
    process.exit(1);
  }

  const fresh   = parseICS(icsText);
  const updated = new Date().toISOString();

  // Leave the file untouched when nothing changed, so the workflow has nothing
  // to commit (rewriting only the timestamp used to create a commit every run).
  if (!hasChanges(existing.shows || [], fresh)) {
    console.log('[calendar] No changes.');
    return;
  }

  const data = { updated, shows: fresh };
  fs.writeFileSync(CALENDAR_JSON, JSON.stringify(data, null, 2), 'utf8');

  console.log(`[calendar] Updated — ${fresh.length} show(s):`);
  fresh.forEach(s => console.log(`  • ${s.title} (${s.start})`));
}

main().catch(err => { console.error(err); process.exit(1); });
