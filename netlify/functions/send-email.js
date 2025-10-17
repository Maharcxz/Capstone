const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }) };
  }

  const { to, subject, html, text } = payload;
  if (!to) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing recipient email (to)' }) };
  }

  // Read SMTP configuration from environment variables
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465; // true for 465, false for other ports
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || user;

  if (!host || !user || !pass) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'SMTP configuration is missing' }) };
  }

  try {
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    const info = await transporter.sendMail({
      from,
      to,
      subject: subject || 'Notification from Trinity Optimum Vision Center',
      text: text || undefined,
      html: html || undefined
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, messageId: info.messageId }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};