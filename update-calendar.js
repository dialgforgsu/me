#!/usr/bin/env node
'use strict';

/**
 * update-calendar.js
 * Fetches the Google Calendar ICS, parses upcoming shows,
 * and writes calendar.json + calendar.md only when events change.
 *
 * Usage:   node update-calendar.js
 * Schedule (Windows Task Scheduler): run every 15 min
 * Schedule (Unix cron):  *\/15 * * * * node /path/to/update-calendar.js
 */

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');

const ICS_URL      = 'https://calendar.google.com/calendar/ical/4973b08352caa62ecc8fe9e9106a62786587da67d9774285d39c27911754213e%40group.calendar.google.com/private-d8a8ffc18a5c2610ef33d0b0893d8e32/basic.ics';
const CALENDAR_JSON = path.join(__dirname, 'calendar.json');
const CALENDAR_MD   = path.join(__dirname, 'calendar.md');
const LOOKAHEAD_MS  = 180 * 24 * 3600 * 1000; // 180 days
const MAX_SHOWS     = 10;

// ── Fetch ─────────────────────────────────────────────────────────────────────

function fetchUrl(rawUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const lib    = parsed.protocol === 'https:' ? https : http;
    lib.get(rawUrl, { headers: { 'User-Agent': 'gsupaek-calendar-updater/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} for ${rawUrl}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── ICS parsing ───────────────────────────────────────────────────────────────

function unfoldICS(text) {
  // ICS long lines are folded with CRLF + whitespace; unfold them
  return text.replace(/\r?\n[ \t]/g, '');
}

function getField(block, key) {
  // Matches KEY: or KEY;param=val: and returns the value
  const m = block.match(new RegExp(`^${key}(?:;[^:]+)?:(.+)`, 'm'));
  if (!m) return '';
  return m[1].trim()
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseDateTime(raw) {
  if (!raw) return null;
  // Strip TZID prefix if present (e.g. value from DTSTART;TZID=America/Chicago:20260501T200000)
  const val  = raw.includes(':') ? raw.split(':').pop() : raw;
  const isUTC = val.endsWith('Z');
  const m    = val.replace('Z', '').match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m;
  const str = `${y}-${mo}-${d}T${h}:${mi}:${s}${isUTC ? 'Z' : ''}`;
  return new Date(str);
}

function parseICS(text) {
  const unfolded = unfoldICS(text);
  const now      = new Date();
  const limit    = new Date(now.getTime() + LOOKAHEAD_MS);
  const results  = [];

  const veventRe = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;

  while ((match = veventRe.exec(unfolded)) !== null) {
    const block = match[1];

    // Skip recurring events (RRULE) — ical.js in the browser handles those
    if (/^RRULE:/m.test(block)) continue;

    const summary  = getField(block, 'SUMMARY');
    const dtstart  = getField(block, 'DTSTART(?:;TZID=[^:]+)?');
    const dtend    = getField(block, 'DTEND(?:;TZID=[^:]+)?');
    const location = getField(block, 'LOCATION');
    const desc     = getField(block, 'DESCRIPTION');
    const url      = getField(block, 'URL');

    if (!summary) continue;

    // Re-extract DTSTART with TZID variant
    const dtstartRaw = (() => {
      const m2 = block.match(/^DTSTART(?:;[^:]+)?:(.+)/m);
      return m2 ? m2[1].trim() : '';
    })();
    const dtendRaw = (() => {
      const m2 = block.match(/^DTEND(?:;[^:]+)?:(.+)/m);
      return m2 ? m2[1].trim() : '';
    })();

    const start = parseDateTime(dtstartRaw);
    if (!start || start < now || start > limit) continue;

    const end = parseDateTime(dtendRaw);

    results.push({
      title:       summary,
      start:       start.toISOString(),
      end:         end ? end.toISOString() : null,
      location:    location,
      description: desc,
      url:         url,
    });
  }

  return results
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

  const lines = [
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
  // Load existing cache
  let existing = { updated: null, shows: [] };
  try { existing = JSON.parse(fs.readFileSync(CALENDAR_JSON, 'utf8')); } catch {}

  console.log('[calendar] Fetching ICS…');
  let icsText;
  try {
    icsText = await fetchUrl(ICS_URL);
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
