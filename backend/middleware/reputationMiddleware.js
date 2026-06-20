const User = require('../models/User');

/**
 * Block restricted users from submitting new reports.
 * Attach this to the POST /api/incidents route only.
 */
async function requireActiveReputation(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isBanned) {
      return res.status(403).json({
        message:    'Your account has been banned due to repeated false reports. Contact support to appeal.',
        isBanned:   true,
        score:      user.reputationScore,
      });
    }

    if (user.isRestricted) {
      return res.status(403).json({
        message:      'Your account is restricted. You cannot submit new reports until your reputation score improves above 30.',
        isRestricted: true,
        score:        user.reputationScore,
      });
    }

    next();
  } catch (err) {
    console.error('Reputation middleware error:', err.message);
    next();
  }
}

module.exports = { requireActiveReputation };