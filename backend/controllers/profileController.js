const User               = require('../models/User');
const PendingEmailChange = require('../models/PendingEmailChange');
const bcrypt             = require('bcryptjs');
const multer             = require('multer');
const path               = require('path');
const fs                 = require('fs');
const { generateVerificationCode, sendVerificationCode } = require('../utils/emailService');

// ── Multer config for profile photos ─────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profiles/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('profilePhoto');

// ── GET /api/profile ──────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PUT /api/profile — update name and phone only ─────────────────
// Email is handled separately with verification
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name)             user.name  = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();
    const updatedUser = await User.findById(user._id).select('-password');
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/profile/email/request — request email change ────────
// Sends a verification code to the NEW email address
const requestEmailChange = async (req, res) => {
  const { newEmail } = req.body;

  if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  try {
    // Check the new email isn't already taken
    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'This email address is already in use' });
    }

    // Generate and store verification code
    const code      = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Remove any existing pending change for this user
    await PendingEmailChange.deleteMany({ userId: req.user._id });

    await PendingEmailChange.create({
      userId:    req.user._id,
      newEmail:  newEmail.toLowerCase(),
      code,
      expiresAt,
    });

    // Send the code to the NEW email
    await sendVerificationCode(newEmail, code, 'email change');

    res.json({
      message: `A 6-digit verification code has been sent to ${newEmail}. It expires in 15 minutes.`
    });

  } catch (error) {
    console.error('Email change request error:', error.message);
    res.status(500).json({ message: 'Failed to send verification code. Check your email configuration.' });
  }
};

// ── POST /api/profile/email/verify — verify code and change email ─
const verifyEmailChange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Verification code is required' });
  }

  try {
    const pending = await PendingEmailChange.findOne({ userId: req.user._id });

    if (!pending) {
      return res.status(400).json({ message: 'No pending email change found. Please request a new code.' });
    }

    if (new Date() > pending.expiresAt) {
      await PendingEmailChange.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (pending.code !== code.trim()) {
      return res.status(400).json({ message: 'Incorrect verification code. Please try again.' });
    }

    // Code is correct — update the email
    const user = await User.findById(req.user._id);
    user.email = pending.newEmail;
    await user.save();

    // Clean up
    await PendingEmailChange.deleteOne({ _id: pending._id });

    res.json({
      message:  'Email address updated successfully.',
      newEmail: user.email,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PUT /api/profile/password ─────────────────────────────────────
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    const user    = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    const salt    = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/profile/photo ───────────────────────────────────────
const uploadProfilePhoto = (req, res) => {
  uploadPhoto(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No photo provided' });

    try {
      const user = await User.findById(req.user._id);
      if (user.profilePhoto) {
        const oldPath = user.profilePhoto.replace('http://localhost:5000/', '');
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profilePhoto = `http://localhost:5000/${req.file.path}`;
      await user.save();
      res.json({ message: 'Profile photo updated', profilePhoto: user.profilePhoto });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

// ── DELETE /api/profile/photo ─────────────────────────────────────
const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.profilePhoto) {
      const oldPath = user.profilePhoto.replace('http://localhost:5000/', '');
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      user.profilePhoto = '';
      await user.save();
    }
    res.json({ message: 'Profile photo removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/profile ───────────────────────────────────────────
const deleteAccount = async (req, res) => {
  const { password } = req.body;
  try {
    const user    = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Password is incorrect' });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/profile/sessions ─────────────────────────────────────
const getSessions = async (req, res) => {
  try {
    const Session = require('../models/Session');
    const sessions = await Session.find({ userId: req.user._id }).sort({ lastActive: -1 });
    
    const sessionsWithCurrent = sessions.map(s => {
      const isCurrent = s.token === req.token;
      return {
        _id: s._id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActive: s.lastActive,
        isCurrent
      };
    });

    res.json(sessionsWithCurrent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/profile/sessions/:id ──────────────────────────────
const revokeSession = async (req, res) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    await Session.deleteOne({ _id: req.params.id });
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/profile/sessions ──────────────────────────────────
const revokeOtherSessions = async (req, res) => {
  try {
    const Session = require('../models/Session');
    await Session.deleteMany({
      userId: req.user._id,
      token: { $ne: req.token }
    });
    res.json({ message: 'All other sessions revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/profile/export ───────────────────────────────────────
const exportUserData = async (req, res) => {
  try {
    const Incident = require('../models/Incident');
    const ForumPost = require('../models/ForumPost');
    const Application = require('../models/Application');

    const user = await User.findById(req.user._id).select('-password');
    const reports = await Incident.find({ reportedBy: req.user._id });
    const forumPosts = await ForumPost.find({ author: req.user._id });
    const applications = await Application.find({ applicant: req.user._id });

    const exportData = {
      exportedAt: new Date().toISOString(),
      userProfile: user,
      reportedIncidents: reports,
      forumPosts: forumPosts,
      responderApplications: applications
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=user-data-${req.user._id}.json`);
    res.send(JSON.stringify(exportData, null, 2));

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  uploadProfilePhoto,
  removeProfilePhoto,
  deleteAccount,
  getSessions,
  revokeSession,
  revokeOtherSessions,
  exportUserData,
};