const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   'smtp-relay.brevo.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// ── Generate a 6-digit numeric code ──────────────────────────────
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Send email verification code ─────────────────────────────────
async function sendVerificationCode(toEmail, code, purpose = 'email change') {
  const subject =
    purpose === 'password_reset' ? 'FireAlert — Password Reset Code' :
    purpose === 'registration'   ? 'FireAlert — Verify Your Account' :
    'FireAlert — Email Verification Code';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0e0e0e; color: #f0ede8; padding: 2rem; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="background: linear-gradient(135deg, #e63c2f, #f4820a); width: 48px; height: 48px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem;">
          🔥
        </div>
        <h1 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0; color: #f0ede8;">
          FireAlert
        </h1>
      </div>

      <h2 style="font-size: 1rem; font-weight: 600; color: #f0ede8; margin: 0 0 0.5rem;">
        ${purpose === 'password_reset' ? 'Reset Your Password' :
          purpose === 'registration'   ? 'Welcome to FireAlert' :
          'Verify Your New Email'}
      </h2>

      <p style="font-size: 0.875rem; color: #888; line-height: 1.6; margin: 0 0 1.5rem;">
        ${purpose === 'password_reset' ? 'You requested a password reset. Use the code below to continue.' :
          purpose === 'registration'   ? 'Thanks for signing up. Enter this code to verify your email and activate your account.' :
          'You requested an email address change. Enter this code to confirm your new email.'}
      </p>

      <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 10px; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.3em; color: #f4820a; font-family: monospace;">
          ${code}
        </div>
        <div style="font-size: 0.75rem; color: #555; margin-top: 0.5rem;">
          This code expires in 15 minutes
        </div>
      </div>

      <p style="font-size: 0.78rem; color: #555; margin: 0;">
        If you did not request this, you can safely ignore this email.
        Your account will not be changed.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject,
    html,
  });
}

// ── Send password reset link ──────────────────────────────────────
async function sendPasswordResetEmail(toEmail, resetLink) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0e0e0e; color: #f0ede8; padding: 2rem; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="background: linear-gradient(135deg, #e63c2f, #f4820a); width: 48px; height: 48px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem;">
          🔥
        </div>
        <h1 style="font-size: 1.25rem; font-weight: 800; margin: 0.75rem 0 0; color: #f0ede8;">
          FireAlert
        </h1>
      </div>

      <h2 style="font-size: 1rem; font-weight: 600; color: #f0ede8; margin: 0 0 0.5rem;">
        Reset Your Password
      </h2>

      <p style="font-size: 0.875rem; color: #888; line-height: 1.6; margin: 0 0 1.5rem;">
        You requested a password reset for your FireAlert account.
        Click the button below to set a new password.
        This link expires in <strong style="color: #f4820a;">1 hour</strong>.
      </p>

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <a href="${resetLink}"
           style="display: inline-block; padding: 0.875rem 2rem; background: linear-gradient(135deg, #e63c2f, #f4820a); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 0.9375rem;">
          Reset Password
        </a>
      </div>

      <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem;">
        <div style="font-size: 0.72rem; color: #555; margin-bottom: 0.3rem;">
          Or copy this link into your browser:
        </div>
        <div style="font-size: 0.72rem; color: #888; word-break: break-all;">
          ${resetLink}
        </div>
      </div>

      <p style="font-size: 0.78rem; color: #555; margin: 0;">
        If you did not request a password reset, you can safely ignore this email.
        Your password will not change.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: 'FireAlert — Reset Your Password',
    html,
  });
}

// ── Send incident status updates ──────────────────────────────────
async function sendStatusUpdateEmail(toEmail, userName, status, fireType, incidentId) {
  const messages = {
    verified:   { subject: 'Your fire report has been verified', body: 'A responder has verified your report and is assessing the situation.' },
    dispatched: { subject: 'Responders dispatched to your report', body: 'Fire responders have been dispatched to the location you reported.' },
    resolved:   { subject: 'Your reported incident has been resolved', body: 'The fire incident you reported has been resolved by our responders.' },
    rejected:   { subject: 'Update on your fire report', body: 'After assessment, your report could not be verified. This may affect your reputation score.' },
  };

  const info = messages[status];
  if (!info) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0e0e0e; color: #f0ede8; padding: 2rem; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="background: linear-gradient(135deg, #e63c2f, #f4820a); width: 48px; height: 48px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem;">🔥</div>
        <h1 style="font-size: 1.1rem; font-weight: 800; margin: .5rem 0 0; color: #f0ede8;">FireAlert</h1>
      </div>
      <h2 style="font-size: 1rem; color: #f0ede8; margin: 0 0 .75rem;">${info.subject}</h2>
      <p style="font-size: .875rem; color: #888; line-height: 1.6; margin: 0 0 1rem;">Hi ${userName}, ${info.body}</p>
      <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
        <div style="font-size: .75rem; color: #555; margin-bottom: .25rem;">Fire Type</div>
        <div style="font-size: .9rem; font-weight: 600; text-transform: capitalize;">${fireType || 'N/A'}</div>
      </div>
      <p style="font-size: .75rem; color: #555;">Open the FireAlert app to view full details.</p>
    </div>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: info.subject,
    html,
  });
}

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendPasswordResetEmail,
  sendStatusUpdateEmail,
};