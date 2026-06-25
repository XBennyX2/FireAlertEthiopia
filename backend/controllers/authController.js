const User               = require('../models/User');
const EmailVerification   = require('../models/EmailVerification');
const Session             = require('../models/Session');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const {
  recordFailedAttempt,
  clearFailedAttempts,
} = require('../middleware/accountLockout');
const { generateVerificationCode, sendVerificationCode } = require('../utils/emailService');

const createSession = async (userId, token, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await Session.create({
      userId,
      token,
      ipAddress,
      userAgent
    });
  } catch (err) {
    console.error('Session creation error:', err.message);
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateRefreshableToken = (id) => {
  return jwt.sign(
    { id, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

async function issueVerificationCode(user) {
  const code      = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min — matches emailService copy

  await EmailVerification.deleteMany({ userId: user._id });
  await EmailVerification.create({ userId: user._id, code, expiresAt });

  await sendVerificationCode(user.email, code, 'registration');
}

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
      name:       name.trim(),
      email:      email.toLowerCase().trim(),
      password:   hashedPassword,
      isVerified: false,
    });

    try {
      await issueVerificationCode(user);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      // Registration still succeeds — they can use "resend" on the verify screen
    }

    res.status(201).json({
      message:    'Account created. Please check your email for a verification code.',
      userId:     user._id,
      email:      user.email,
      isVerified: false,
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── Verify Email ──────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  const { userId, code } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ message: 'Missing verification details.' });
  }

  try {
    const record = await EmailVerification.findOne({ userId, code });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    if (record.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: record._id });
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.isVerified = true;
    await user.save();

    await EmailVerification.deleteMany({ userId });

    const token = generateRefreshableToken(user._id);
    await createSession(user._id, token, req);

    res.json({
      _id:             user._id,
      name:            user.name,
      email:           user.email,
      role:            user.role,
      reputationScore: user.reputationScore,
      profilePhoto:    user.profilePhoto,
      token,
    });

  } catch (error) {
    console.error('Verify email error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── Resend Verification Code ───────────────────────────────────────
const resendVerificationCode = async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ message: 'Missing user id.' });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified.' });

    await issueVerificationCode(user);
    res.json({ message: 'A new verification code has been sent to your email.' });

  } catch (error) {
    console.error('Resend code error:', error.message);
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

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned due to repeated violations.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = await recordFailedAttempt(user._id);
      const remaining = Math.max(0, 5 - (attempts || 0));
      return res.status(401).json({
        message: remaining > 0
          ? `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account is temporarily locked.`
          : 'Invalid email or password.',
      });
    }

    // Block unverified accounts AFTER password check
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        userId: user._id,
        email:  user.email,
      });
    }

    await clearFailedAttempts(user._id);

    user.lastLogin = new Date();
    await user.save();

    const token = generateRefreshableToken(user._id);
    await createSession(user._id, token, req);

    res.json({
      _id:              user._id,
      name:             user.name,
      email:            user.email,
      role:             user.role,
      reputationScore:  user.reputationScore,
      falseReportCount: user.falseReportCount,
      profilePhoto:     user.profilePhoto,
      token,
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const Session = require('../models/Session');
    if (req.token) {
      await Session.deleteOne({ token: req.token });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, verifyEmail, resendVerificationCode, logout };