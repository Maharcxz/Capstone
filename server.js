// Simple local email API using Express and Nodemailer
// Run with: `node server.js` (or `npm run email:server` if added)

import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Allow local dev origins (vite dev, static preview). Adjust as needed.
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: false,
  })
);

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn(
    '[email-api] Missing SMTP env vars. Create a .env file with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.'
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 465),
  secure: Number(SMTP_PORT || 465) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'Missing recipient (to)' });
    const info = await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject: subject || '',
      text: text || '',
      html: html || undefined,
    });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('[email-api] send-email error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Send failed' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`[email-api] Listening on http://localhost:${port}`);
});