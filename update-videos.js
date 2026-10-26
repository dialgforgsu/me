#!/usr/bin/env node
'use strict';

/**
 * update-videos.js
 * Fetches the Hot Pot Comedy uploads and writes hotpot.json, so the browser
 * loads videos same-origin instead of via a CORS proxy.
 * Uses the YouTube Data API when YOUTUBE_API_KEY is set, otherwise the RSS feed.
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
// A channel's uploads playlist ID is its channel ID with UC swapped for UU.
const UPLOADS_PLAYLIST_ID = 'UU' + CHANNEL_ID.slice(2);
const API_KEY = process.env.YOUTUBE_API_KEY;
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

async function fetchFromFeed() {
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'gsupaek-video-updater/1.0' } });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  return parseFeed(await res.text());
}

async function fetchFromApi() {
  const url =
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50' +
    `&playlistId=${UPLOADS_PLAYLIST_ID}&key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json();
  return (data.items || [])
    .map((item) => ({
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      published: item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
    }))
    .filter((v) => /^[\w-]{5,20}$/.test(v.videoId) && v.title !== 'Private video');
}

async function main() {
  const videos = API_KEY ? await fetchFromApi() : await fetchFromFeed();
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
