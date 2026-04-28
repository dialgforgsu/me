#!/usr/bin/env node
'use strict';

/**
 * update-calendar.js
 * Fetches the Google Calendar ICS, expands recurring events,
 * and writes calendar.json + calendar.md only when events change.
 *
 * Usage:   node update-calendar.js
 * GitHub Actions: runs on schedule via .github/workflows/update-calendar.yml
 */

const fetch        = require('node-fetch');
const IcalExpander = require('ical-expander');
const fs           = require('fs');
const path         = require('path');

const ICS_URL       = 'https://calendar.google.com/calendar/ical/4973b08352caa62ecc8fe9e9106a62786587da67d9774285d39c27911754213e%40group.calendar.google.com/private-d8a8ffc18a5c2610ef33d0b0893d8e32/basic.ics';
const CALENDAR_JSON = path.join(__dirname, 'calendar.json');
const CALENDAR_MD   = path.join(__dirname, 'calendar.md');
const LOOKAHEAD_MS  = 365 * 24 * 3600 * 1000; // 1 year
const MAX_SHOWS     = 10;

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

function showKey(s) { return `${s.title}|${s.start}`; }

function hasChanges(existing, fresh) {
  if (existing.length !== fresh.length) return true;
  const existKeys = new Set(existing.map(showKey));
  return fresh.some(s => !existKeys.has(showKey(s)));
}

// ── Write calendar.md ─────────────────────────────────────────────────────────

function writeMD(shows, updated) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const lines  = [
    '# G-Su Paek — Calendar Cache',
    `_Last updated: ${updated}_`,
    '',
  ];

  if (!shows.length) {
    lines.push('_No upcoming shows._');
  } else {
    shows.forEach(s => {
      const d    = new Date(s.start);
      const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
      lines.push(`## ${s.title}`);
      lines.push(`- **Date:** ${date} at ${time}`);
      if (s.location)    lines.push(`- **Venue:** ${s.location}`);
      if (s.url)         lines.push(`- **Tickets:** ${s.url}`);
      if (s.description) lines.push(`- **Details:** ${s.description.split('\n')[0]}`);
      lines.push('');
    });
  }

  fs.writeFileSync(CALENDAR_MD, lines.join('\n'), 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
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

  if (!hasChanges(existing.shows || [], fresh)) {
    console.log('[calendar] No changes — updating timestamp only.');
    existing.updated = updated;
    fs.writeFileSync(CALENDAR_JSON, JSON.stringify(existing, null, 2), 'utf8');
    return;
  }

  const data = { updated, shows: fresh };
  fs.writeFileSync(CALENDAR_JSON, JSON.stringify(data, null, 2), 'utf8');
  writeMD(fresh, updated);

  console.log(`[calendar] Updated — ${fresh.length} show(s):`);
  fresh.forEach(s => console.log(`  • ${s.title} (${s.start})`));
}

main().catch(err => { console.error(err); process.exit(1); });
