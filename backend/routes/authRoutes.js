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

module.exports = router;