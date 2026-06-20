const User = require('../models/User');

const MAX_ATTEMPTS  = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes in ms

async function checkAccountLockout(req, res, next) {
  const { email } = req.body;
  if (!email) return next();

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // No user found — let authController handle it
    if (!user) return next();

    // Check if account is currently locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account is temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        lockedUntil: user.lockUntil,
      });
    }

    // Lock has expired — reset the counter
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.loginAttempts = 0;
      user.lockUntil     = undefined;
      await user.save();
    }

    next();
  } catch (err) {
    console.error('Account lockout check error:', err.message);
    next(); // fail open so legitimate users aren't blocked by middleware errors
  }
}

async function recordFailedAttempt(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.loginAttempts = (user.loginAttempts || 0) + 1;

    if (user.loginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil     = new Date(Date.now() + LOCK_DURATION);
      user.loginAttempts = 0; // reset after locking
      console.warn(`Account locked: ${user.email} (${MAX_ATTEMPTS} failed attempts)`);
    }

    await user.save();
    return user.loginAttempts;
  } catch (err) {
    console.error('Record failed attempt error:', err.message);
  }
}

async function clearFailedAttempts(userId) {
  try {
    await User.findByIdAndUpdate(userId, {
      loginAttempts: 0,
      lockUntil:     undefined,
    });
  } catch (err) {
    console.error('Clear failed attempts error:', err.message);
  }
}

module.exports = {
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
};