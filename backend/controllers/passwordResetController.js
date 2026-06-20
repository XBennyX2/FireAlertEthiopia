const crypto        = require('crypto');
const User          = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const bcrypt        = require('bcryptjs');
const { sendPasswordResetEmail } = require('../utils/emailService');

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success even if email not found
    // This prevents user enumeration attacks
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a reset link has been sent.'
      });
    }

    // Delete any existing reset tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    // Generate a secure random token
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.create({
      userId: user._id,
      token,
      expiresAt,
    });

    // Build reset link — points to frontend route
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetLink);

    console.log(`Password reset email sent to ${user.email}`);

    res.json({
      message: 'If an account with that email exists, a reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
};

// GET /api/auth/reset-password/verify?token=xxx
// Called by the frontend to check if a token is valid before showing the form
const verifyResetToken = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token is required' });
  }

  try {
    const record = await PasswordReset.findOne({ token, used: false });

    if (!record) {
      return res.json({ valid: false, message: 'This reset link is invalid or has already been used.' });
    }

    if (new Date() > record.expiresAt) {
      await PasswordReset.deleteOne({ _id: record._id });
      return res.json({ valid: false, message: 'This reset link has expired. Please request a new one.' });
    }

    res.json({ valid: true, message: 'Token is valid' });

  } catch (error) {
    res.status(500).json({ valid: false, message: error.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const record = await PasswordReset.findOne({ token, used: false });

    if (!record) {
      return res.status(400).json({ message: 'This reset link is invalid or has already been used.' });
    }

    if (new Date() > record.expiresAt) {
      await PasswordReset.deleteOne({ _id: record._id });
      return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
    }

    // Hash the new password
    const salt     = await bcrypt.genSalt(10);
    const hashed   = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    await User.findByIdAndUpdate(record.userId, { password: hashed });

    // Mark token as used — prevents replay attacks
    record.used = true;
    await record.save();

    console.log(`Password reset successful for user ${record.userId}`);

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { forgotPassword, verifyResetToken, resetPassword };