// Simple local email API using Express and Nodemailer
// Run with: `node server.js` (or `npm run email:server` if added)

import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

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
  FROM_EMAIL,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn(
    '[email-api] Missing SMTP env vars. Using Ethereal test SMTP for local development.'
  );
}

// Lazy transporter initialization with Ethereal fallback for local testing
let transporter = null;
let usingEthereal = false;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  usingEthereal = true;
  nodemailer
    .createTestAccount()
    .then((account) => {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      });
      console.log(`[email-api] Using Ethereal test SMTP. Login: ${account.user}`);
    })
    .catch((err) => {
      console.error('[email-api] Failed to create Ethereal test account:', err);
    });
}

app.post('/api/send-email', async (req, res) => {
  try {
    if (!transporter) {
      return res
        .status(503)
        .json({ ok: false, error: 'Email transporter not ready. Try again shortly.' });
    }
    const { to, subject, text, html } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'Missing recipient (to)' });

    const fromAddress = FROM_EMAIL || SMTP_USER || 'no-reply@trinity.local';

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: subject || '',
      text: text || '',
      html: html || undefined,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('[email-api] Preview URL:', previewUrl);
    }

    return res.json({ ok: true, messageId: info.messageId, previewUrl: previewUrl || null });
  } catch (err) {
    console.error('[email-api] send-email error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Send failed' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`[email-api] Listening on http://localhost:${port}`);
});