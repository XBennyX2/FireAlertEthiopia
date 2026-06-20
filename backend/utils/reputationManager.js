const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// ── Thresholds ────────────────────────────────────────────────────
const THRESHOLDS = {
  WARNING:    60,  // below this → warning level
  RESTRICTED: 30,  // below this → restricted (can't submit reports)
  BANNED:     10,  // below this → banned (can't log in)
};

/**
 * Apply reputation consequences automatically after any score change.
 * Called every time a reputation score is updated.
 */
async function applyReputationConsequences(userId, newScore) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const previousStatus = {
      isBanned:     user.isBanned,
      isRestricted: user.isRestricted,
    };

    // ── Determine new status from score ──────────────────────────
    if (newScore <= THRESHOLDS.BANNED) {
      user.isBanned     = true;
      user.isRestricted = true;
    } else if (newScore <= THRESHOLDS.RESTRICTED) {
      user.isBanned     = false;
      user.isRestricted = true;
    } else {
      user.isBanned     = false;
      user.isRestricted = false;
    }

    user.reputationScore = newScore;
    await user.save();

    // ── Log status changes to audit log ──────────────────────────
    if (user.isBanned && !previousStatus.isBanned) {
      await AuditLog.create({
        performedBy: null,
        action:      'ACCOUNT_AUTO_BANNED',
        details:     `User ${user.email} automatically banned. Reputation score: ${newScore}`,
      });
      console.warn(`AUTO-BAN: ${user.email} banned (score: ${newScore})`);
    } else if (user.isRestricted && !previousStatus.isRestricted) {
      await AuditLog.create({
        performedBy: null,
        action:      'ACCOUNT_AUTO_RESTRICTED',
        details:     `User ${user.email} automatically restricted. Reputation score: ${newScore}`,
      });
      console.warn(`AUTO-RESTRICT: ${user.email} restricted (score: ${newScore})`);
    } else if (!user.isRestricted && previousStatus.isRestricted) {
      await AuditLog.create({
        performedBy: null,
        action:      'ACCOUNT_AUTO_UNRESTRICTED',
        details:     `User ${user.email} automatically unrestricted. Reputation score: ${newScore}`,
      });
    }

    return {
      isBanned:     user.isBanned,
      isRestricted: user.isRestricted,
      score:        newScore,
    };

  } catch (err) {
    console.error('Reputation consequence error:', err.message);
  }
}

/**
 * Update a user's reputation score and apply consequences.
 * Use this everywhere instead of direct DB updates.
 */
async function updateReputationScore(userId, outcome) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const adjustments = {
      verified:     10,
      false_report: -15,
      spam:         -25,
    };

    const adjustment = adjustments[outcome] || 0;
    const newScore   = Math.max(0, Math.min(100, (user.reputationScore || 100) + adjustment));

    return await applyReputationConsequences(userId, newScore);

  } catch (err) {
    console.error('Update reputation error:', err.message);
    return null;
  }
}

module.exports = {
  applyReputationConsequences,
  updateReputationScore,
  THRESHOLDS,
};