const User    = require('../models/User');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const {
  recordFailedAttempt,
  clearFailedAttempts,
} = require('../middleware/accountLockout');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Generate a shorter-lived refresh-capable token
const generateRefreshableToken = (id) => {
  return jwt.sign(
    { id, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ── Register ──────────────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email and password' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name:  name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    res.status(201).json({
      _id:            user._id,
      name:           user.name,
      email:          user.email,
      role:           user.role,
      reputationScore: user.reputationScore,
      profilePhoto:   user.profilePhoto,
      token:          generateRefreshableToken(user._id),
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── Login ─────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is deactivated
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    // Check if account is banned
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned due to repeated violations.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Record failed attempt — may trigger lockout
      const attempts = await recordFailedAttempt(user._id);

      const remaining = Math.max(0, 5 - (attempts || 0));
      return res.status(401).json({
        message: remaining > 0
          ? `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account is temporarily locked.`
          : 'Invalid email or password.',
      });
    }

    // Successful login — clear failed attempts
    await clearFailedAttempts(user._id);

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    res.json({
      _id:             user._id,
      name:            user.name,
      email:           user.email,
      role:            user.role,
      reputationScore: user.reputationScore,
      falseReportCount: user.falseReportCount,
      profilePhoto:    user.profilePhoto,
      token:           generateRefreshableToken(user._id),
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login };