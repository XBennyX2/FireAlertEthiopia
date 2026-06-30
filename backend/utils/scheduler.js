const SafetyContent = require('../models/SafetyContent');

async function publishScheduledContent() {
  try {
    const now = new Date();
    const due = await SafetyContent.find({
      status:       'approved',
      scheduledFor: { $lte: now },
      publishedAt:  { $exists: false },
    });

    for (const item of due) {
      item.publishedAt = now;
      await item.save();
      console.log(`Auto-published safety content: ${item.title}`);
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

const User         = require('../models/User');
const { sendVerificationCode } = require('./emailService');
const nodemailer   = require('nodemailer');

async function sendWeeklySafetyDigest() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newContent = await SafetyContent.find({
      status:     'approved',
      publishedAt:{ $gte: oneWeekAgo },
    }).limit(5);

    if (newContent.length === 0) return;

    const users = await User.find({ isActive: true, isVerified: true })
      .select('email name notificationPrefs');

    const transporter = require('../config/mailer'); // reuse your existing transporter

    const contentHtml = newContent.map(c => `
      <div style="padding:.75rem 0;border-bottom:1px solid #2a2a2a;">
        <div style="font-weight:700;color:#f0ede8;margin-bottom:.3rem;">${c.title}</div>
        <div style="font-size:.8rem;color:#888;line-height:1.6;">${c.body.substring(0,200)}…</div>
      </div>
    `).join('');

    for (const user of users) {
      if (user.notificationPrefs?.emailOnResolved === false) continue; // reuse toggle as "digest" opt-in proxy
      await transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to:      user.email,
        subject: 'FireAlert Weekly Safety Digest',
        html: `
          <div style="font-family:Arial;max-width:480px;margin:0 auto;background:#0e0e0e;color:#f0ede8;padding:2rem;border-radius:12px;">
            <h2 style="color:#f4820a;font-size:1rem;margin:0 0 1rem;">🛡️ This Week in Fire Safety</h2>
            ${contentHtml}
            <p style="font-size:.75rem;color:#555;margin-top:1rem;">
              You're receiving this because you have a FireAlert account.
            </p>
          </div>
        `,
      }).catch(() => {}); // Don't let one failed email crash the loop
    }

    console.log(`Safety digest sent to ${users.length} users`);
  } catch (err) {
    console.error('Digest error:', err.message);
  }
}
async function sendAdminWeeklyReport() {
  try {
    const admins  = await User.find({ role: 'admin', isActive: true }).select('email name');
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [newUsers, newIncidents, resolved, rejected] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Incident.countDocuments({ reportedAt: { $gte: oneWeekAgo } }),
      Incident.countDocuments({ status:'resolved', resolvedAt: { $gte: oneWeekAgo } }),
      Incident.countDocuments({ status:'rejected', updatedAt: { $gte: oneWeekAgo } }),
    ]);

    const transporter = require('./emailTransporter');

    for (const admin of admins) {
      await transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to:      admin.email,
        subject: `FireAlert Weekly Report — ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family:Arial;max-width:480px;margin:0 auto;background:#0e0e0e;color:#f0ede8;padding:2rem;border-radius:12px;">
            <h2 style="color:#f4820a;font-size:1rem;margin:0 0 1.5rem;">📊 Weekly Admin Report</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.5rem;">
              <div style="background:#161616;border-radius:8px;padding:.75rem;">
                <div style="font-size:.75rem;color:#555;">New Users</div>
                <div style="font-size:1.5rem;font-weight:800;color:#3b82f6;">${newUsers}</div>
              </div>
              <div style="background:#161616;border-radius:8px;padding:.75rem;">
                <div style="font-size:.75rem;color:#555;">New Incidents</div>
                <div style="font-size:1.5rem;font-weight:800;color:#f4820a;">${newIncidents}</div>
              </div>
              <div style="background:#161616;border-radius:8px;padding:.75rem;">
                <div style="font-size:.75rem;color:#555;">Resolved</div>
                <div style="font-size:1.5rem;font-weight:800;color:#22c55e;">${resolved}</div>
              </div>
              <div style="background:#161616;border-radius:8px;padding:.75rem;">
                <div style="font-size:.75rem;color:#555;">Rejected</div>
                <div style="font-size:1.5rem;font-weight:800;color:#e63c2f;">${rejected}</div>
              </div>
            </div>
            <p style="font-size:.75rem;color:#555;">Open the admin dashboard for full details.</p>
          </div>
        `,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Admin weekly report error:', err.message);
  }
}

module.exports = { publishScheduledContent, sendWeeklySafetyDigest, sendAdminWeeklyReport };

// module.exports = { publishScheduledContent, sendWeeklySafetyDigest };
// module.exports = { publishScheduledContent };