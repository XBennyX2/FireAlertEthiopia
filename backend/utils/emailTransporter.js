// Legacy transporter shim — now uses Resend HTTP API via emailService.js
// Kept for backward compatibility with any code that imports this directly
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Mimic nodemailer's sendMail interface
module.exports = {
  sendMail: async ({ from, to, subject, html }) => {
    return resend.emails.send({
      from: from || process.env.EMAIL_FROM || 'FireAlert <onboarding@resend.dev>',
      to:   Array.isArray(to) ? to : [to],
      subject,
      html,
    });
  },
};