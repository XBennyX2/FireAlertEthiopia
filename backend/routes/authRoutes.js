const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const {
  register, login, verifyEmail,
  resendVerificationCode, logout,
} = require('../controllers/authController');
const {
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require('../controllers/passwordResetController');
const { protect } = require('../middleware/authMiddleware');
const User    = require('../models/User');
const Session = require('../models/Session');
const passport = require('../config/passport');
const jwt      = require('jsonwebtoken');
const {
  register, login, verifyEmail, resendVerificationCode, logout,
  enableTwoFactor, confirmTwoFactor, disableTwoFactor,
  verifyTwoFactor, resendTwoFactorCode,
} = require('../controllers/authController');

// ── 2FA ───────────────────────────────────────────────────────────
router.post('/2fa/verify',   verifyTwoFactor);
router.post('/2fa/resend',   resendTwoFactorCode);
router.post('/2fa/enable',   protect, enableTwoFactor);
router.post('/2fa/confirm',  protect, confirmTwoFactor);
router.post('/2fa/disable',  protect, disableTwoFactor);

// ── Auth ──────────────────────────────────────────────────────────
router.post('/register',            register);
router.post('/login',               login);
router.post('/logout',              protect, logout);
router.post('/verify-email',        verifyEmail);
router.post('/resend-verification', resendVerificationCode);

// ── Password reset ────────────────────────────────────────────────
router.post('/forgot-password',      forgotPassword);
router.get('/reset-password/verify', verifyResetToken);
router.post('/reset-password',       resetPassword);

const LoginHistory = require('../models/LoginHistory');

router.get('/login-history', protect, async (req, res) => {
  try {
    const history = await LoginHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const Appeal = require('../models/Appeal');

// POST /api/auth/appeal — banned user submits an appeal (no auth needed)
router.post('/appeal', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email || !reason?.trim()) {
      return res.status(400).json({ message: 'Email and reason are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (!user.isBanned) return res.status(400).json({ message: 'This account is not banned.' });

    const existing = await Appeal.findOne({ userId: user._id, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'You already have a pending appeal.' });

    await Appeal.create({ userId: user._id, reason: reason.trim() });
    res.json({ message: 'Your appeal has been submitted. An admin will review it shortly.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ── Current user ──────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Token refresh ─────────────────────────────────────────────────
router.post('/refresh', protect, async (req, res) => {
  try {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const user = await User.findById(req.user._id).select('-password');
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Session management ────────────────────────────────────────────

// GET /api/auth/sessions — list all active sessions for current user
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .sort({ lastActive: -1 });

    // Mark which session is current
    const currentToken = req.headers.authorization?.split(' ')[1];
    const result = sessions.map(s => ({
      _id:        s._id,
      ipAddress:  s.ipAddress || 'Unknown',
      userAgent:  s.userAgent || 'Unknown device',
      createdAt:  s.createdAt,
      lastActive: s.lastActive,
      isCurrent:  s.token === currentToken,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/auth/sessions/:id — revoke a specific session
router.delete('/sessions/:id', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Users can only revoke their own sessions
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Session.deleteOne({ _id: req.params.id });
    res.json({ message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/auth/sessions — revoke all other sessions
router.delete('/sessions', protect, async (req, res) => {
  try {
    const currentToken = req.headers.authorization?.split(' ')[1];
    await Session.deleteMany({
      userId: req.user._id,
      token: { $ne: currentToken },
    });
    res.json({ message: 'All other sessions revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Google OAuth ──────────────────────────────────────────────────

// Step 1: redirect user to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects back here
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  async (req, res) => {
    try {
      const user  = req.user;
      const token = jwt.sign(
        { id: user._id, iat: Math.floor(Date.now() / 1000) },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Create session
      const Session = require('../models/Session');
      await Session.create({
        userId:    user._id,
        token,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      }).catch(() => {});

      // Redirect to frontend with token — frontend picks it up and logs in
      const userData = encodeURIComponent(JSON.stringify({
        _id:             user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        reputationScore: user.reputationScore,
        profilePhoto:    user.profilePhoto,
        token,
      }));

      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?data=${userData}`);
    } catch (err) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

module.exports = router;