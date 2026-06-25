const express = require('express');
const router  = express.Router();
const { register, login } = require('../controllers/authController');
const {
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require('../controllers/passwordResetController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// ── Auth routes ───────────────────────────────────────────────────
router.post('/register', register);
router.post('/login',    login);

// ── Password reset routes ─────────────────────────────────────────
router.post('/forgot-password',           forgotPassword);
router.get('/reset-password/verify',      verifyResetToken);
router.post('/reset-password',            resetPassword);

const { verifyEmail, resendVerificationCode } = require('../controllers/authController');

router.post('/verify-email',        verifyEmail);
router.post('/resend-verification', resendVerificationCode);
// ── Get current user (used by refreshUser in AuthContext) ─────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const jwt = require('jsonwebtoken');

// POST /api/auth/refresh — refresh a JWT token before it expires
router.post('/refresh', protect, async (req, res) => {
  try {
    // Issue a fresh token with a new 7-day expiry
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

module.exports = router;