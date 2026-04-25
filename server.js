'use strict';
require('dotenv').config();

const express      = require('express');
const path         = require('path');
const Database     = require('better-sqlite3');
const nodemailer   = require('nodemailer');
const fetch        = require('node-fetch');
const IcalExpander = require('ical-expander');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── SQLite ──────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'contacts.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    email        TEXT    NOT NULL,
    subject      TEXT,
    message      TEXT    NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Nodemailer (Gmail App Password) ────────────────────────────────────
const RECIPIENT = 'gsu.paek+website@gmail.com';
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn('[Email] SMTP_USER / SMTP_PASS not set — email notifications disabled.');
}

// ── Calendar cache (5 min TTL) ──────────────────────────────────────────
const CALENDAR_URL = process.env.CALENDAR_ICS_URL || '';
let showsCache = { data: null, ts: 0 };
const CACHE_TTL  = 5 * 60 * 1000;

// ── Middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── POST /api/contact ───────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  try {
    db.prepare(
      'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), email.trim(), (subject || '').trim(), message.trim());
  } catch (err) {
    console.error('[DB]', err.message);
    return res.status(500).json({ error: 'Failed to save your message.' });
  }

  if (transporter) {
    transporter.sendMail({
      from:    `"G-Su Paek Website" <${process.env.SMTP_USER}>`,
      to:      RECIPIENT,
      replyTo: `"${name}" <${email}>`,
      subject: `[Contact] ${subject || 'General'} — from ${name}`,
      html: `
        <h2 style="font-family:sans-serif;margin-bottom:16px">New Contact Form Submission</h2>
        <table style="font-family:sans-serif;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 16px 4px 0;color:#666">Name</td><td><strong>${name}</strong></td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#666">Subject</td><td>${subject || '—'}</td></tr>
        </table>
        <p style="font-family:sans-serif;font-size:14px;margin-top:20px;line-height:1.6">
          <strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}
        </p>
      `,
    }).catch(err => console.error('[Email]', err.message));
  }

  res.json({ ok: true });
});

// ── GET /api/shows ──────────────────────────────────────────────────────
app.get('/api/shows', async (req, res) => {
  if (!CALENDAR_URL) return res.json([]);

  const now = Date.now();
  if (showsCache.data && now - showsCache.ts < CACHE_TTL) {
    return res.json(showsCache.data);
  }

  try {
    const raw      = await fetch(CALENDAR_URL).then(r => r.text());
    const expander = new IcalExpander({ ics: raw, maxIterationCount: 500 });
    const from     = new Date();
    const to       = new Date(from.getTime() + 180 * 24 * 60 * 60 * 1000);

    const { events, occurrences } = expander.between(from, to);

    const toObj = (summary, location, description, url, startDate, endDate) => ({
      title:       summary       || '',
      start:       startDate.toJSDate().toISOString(),
      end:         endDate ? endDate.toJSDate().toISOString() : null,
      location:    location      || '',
      description: description   || '',
      url:         url           || '',
    });

    const all = [
      ...events.map(e =>
        toObj(e.summary, e.location, e.description, e.url, e.startDate, e.endDate)),
      ...occurrences.map(o =>
        toObj(o.item.summary, o.item.location, o.item.description, o.item.url, o.startDate, o.endDate)),
    ]
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);

    showsCache = { data: all, ts: Date.now() };
    res.json(all);
  } catch (err) {
    console.error('[Calendar]', err.message);
    res.status(500).json({ error: 'Failed to fetch calendar data.' });
  }
});

app.listen(PORT, () => {
  console.log(`\nG-Su Paek site → http://localhost:${PORT}\n`);
});
