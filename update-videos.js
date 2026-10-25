#!/usr/bin/env node
'use strict';

/**
 * update-videos.js
 * Fetches the Hot Pot Comedy YouTube RSS feed and writes hotpot.json,
 * so the browser loads videos same-origin instead of via a CORS proxy.
 * Writes only when the video list changes.
 *
 * Usage: node update-videos.js   (also run by .github/workflows/update-calendar.yml)
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const CHANNEL_ID = 'UCFVYOfmUZd03OLl4oRBI5Yg';
const FEED_URL =
  process.env.HOTPOT_FEED_URL ||
  `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const OUT = path.join(__dirname, 'hotpot.json');

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseFeed(xml) {
  const videos = [];
  const entryRx = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRx.exec(xml)) !== null) {
    const block = m[1];
    const videoId = (/<yt:videoId>([^<]+)<\/yt:videoId>/.exec(block) || [])[1] || '';
    const title = (/<title>([^<]*)<\/title>/.exec(block) || [])[1] || '';
    const published = (/<published>([^<]+)<\/published>/.exec(block) || [])[1] || '';
    if (/^[\w-]{5,20}$/.test(videoId)) {
      videos.push({ videoId, title: decodeXml(title), published });
    }
  }
  return videos;
}

async function main() {
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'gsupaek-video-updater/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const videos = parseFeed(await res.text());
  if (!videos.length) throw new Error('feed had no videos; keeping existing hotpot.json');

  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {
    /* first run */
  }
  if (existing && JSON.stringify(existing.videos) === JSON.stringify(videos)) {
    console.log('[videos] No changes.');
    return;
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify({ updated: new Date().toISOString(), videos }, null, 2) + '\n',
    'utf8'
  );
  console.log(`[videos] Updated — ${videos.length} video(s).`);
}

main().catch((err) => {
  console.error('[videos]', err.message);
  process.exit(1);
});
