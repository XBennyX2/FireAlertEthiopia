const AuditLog = require('../models/AuditLog');

// Track request patterns per IP in memory
// In production this would be Redis but in-memory works for development
const ipTracker = new Map();

function trackIP(ip) {
  const now     = Date.now();
  const window  = 60 * 1000; // 1 minute window
  const tracker = ipTracker.get(ip) || { requests: [], flagged: false };

  // Remove requests outside the window
  tracker.requests = tracker.requests.filter(t => now - t < window);
  tracker.requests.push(now);

  ipTracker.set(ip, tracker);
  return tracker.requests.length;
}

async function detectSuspiciousLogin(req, res, next) {
  const ip           = req.ip || req.connection.remoteAddress;
  const requestCount = trackIP(ip);

  // Flag if more than 30 login attempts per minute from one IP
  if (requestCount > 30) {
    console.warn(`SUSPICIOUS: High login frequency from IP ${ip} — ${requestCount} attempts/min`);

    try {
      // Log to audit log so admin can see it
      await AuditLog.create({
        performedBy: null, // system-generated, no specific user
        action:      'SUSPICIOUS_LOGIN_ACTIVITY',
        details:     `High frequency login attempts from IP ${ip}: ${requestCount} requests/minute`,
      });
    } catch (err) {
      // Non-blocking — don't fail the request if logging fails
    }
  }

  next();
}

module.exports = { detectSuspiciousLogin };