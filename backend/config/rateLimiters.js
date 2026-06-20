const rateLimit = require('express-rate-limit');

// ── Generic API limiter — applies to all routes ───────────────────
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,
  message:          { message: 'Too many requests from this IP. Please try again in 15 minutes.' },
  standardHeaders:  true,
  legacyHeaders:    false,
});

// ── Auth limiter — stricter for login and register ────────────────
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              10,              // 10 attempts per 15 minutes
  message:          { message: 'Too many login attempts. Please wait 15 minutes and try again.' },
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: true,     // only count failed attempts
});

// ── Password reset limiter — very strict ──────────────────────────
const passwordResetLimiter = rateLimit({
  windowMs:         60 * 60 * 1000, // 1 hour
  max:              5,               // 5 reset requests per hour
  message:          { message: 'Too many password reset attempts. Please wait 1 hour.' },
  standardHeaders:  true,
  legacyHeaders:    false,
});

// ── Report submission limiter ─────────────────────────────────────
const reportLimiter = rateLimit({
  windowMs:         60 * 60 * 1000, // 1 hour
  max:              20,              // 20 reports per hour per IP
  message:          { message: 'Too many reports submitted. Please wait before submitting again.' },
  standardHeaders:  true,
  legacyHeaders:    false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  reportLimiter,
};