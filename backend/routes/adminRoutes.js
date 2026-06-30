const express = require('express');
const router  = express.Router();

// Middleware Imports
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const { submitApplication, getMyApplication } = require('../controllers/adminController');

// Note: these use protect only (any logged-in user), not authorize('admin')
router.post('/applications',      protect, submitApplication);
router.post('/bulk-message', protect, authorize('admin'), bulkMessage);
router.get('/applications/mine',  protect, getMyApplication);
router.get('/users/:id/detail', protect, authorize('admin'), getUserDetail);
// Controller Imports (All consolidated here)
const {
  getAllUsers,
  changeUserRole,
  toggleUserStatus,
  getApplications,
  // submitApplication,
  approveApplication,
  rejectApplication,
  getAuditLogs,
  adjustReputation,
  unbanUser,
  getAnalytics,
  exportAuditLogsCSV,
  exportAnalyticsCSV,
  exportAnalyticsPDF,
  exportUsersCSV,
  importUsersCSV
} = require('../controllers/adminController');

const Appeal = require('../models/Appeal');

router.get('/appeals', protect, authorize('admin'), async (req, res) => {
  try {
    const appeals = await Appeal.find({ status: 'pending' })
      .populate('userId', 'name email reputationScore isBanned')
      .sort({ createdAt: -1 });
    res.json(appeals);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/appeals/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.id).populate('userId');
    if (!appeal) return res.status(404).json({ message: 'Appeal not found.' });

    // Unban the user
    const { applyReputationConsequences } = require('../utils/reputationManager');
    await applyReputationConsequences(appeal.userId._id, 65);

    appeal.status     = 'approved';
    appeal.reviewedBy = req.user._id;
    await appeal.save();

    await log(req.user._id, 'APPEAL_APPROVED', `Appeal approved for ${appeal.userId.email}`);
    res.json({ message: 'Appeal approved. User unbanned.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/appeals/:id/deny', protect, authorize('admin'), async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.id);
    if (!appeal) return res.status(404).json({ message: 'Appeal not found.' });

    appeal.status     = 'denied';
    appeal.adminNote  = req.body.note || '';
    appeal.reviewedBy = req.user._id;
    await appeal.save();

    res.json({ message: 'Appeal denied.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Admin-Only Routes ─────────────────────────────────────────────

// User Management
router.get('/users',            protect, authorize('admin'), getAllUsers);
router.put('/users/:id/role',   protect, authorize('admin'), changeUserRole);
router.put('/users/:id/status', protect, authorize('admin'), toggleUserStatus);
router.put('/users/:id/unban',  protect, authorize('admin'), unbanUser);

// Reputation
router.put('/users/:id/reputation', protect, authorize('admin'), adjustReputation);

// Applications (Admin side)
router.get('/applications',             protect, authorize('admin'), getApplications);
router.put('/applications/:id/approve', protect, authorize('admin'), approveApplication);
router.put('/applications/:id/reject',  protect, authorize('admin'), rejectApplication);

// Logs & Analytics
router.get('/audit-logs',      protect, authorize('admin'), getAuditLogs);
router.get('/analytics', protect, authorize('admin'), getAnalytics);

// Data Export / Import
router.get('/audit-logs/export',     protect, authorize('admin'), exportAuditLogsCSV);
router.get('/analytics/export/csv',  protect, authorize('admin'), exportAnalyticsCSV);
router.get('/analytics/export/pdf',  protect, authorize('admin'), exportAnalyticsPDF);
router.get('/users/export',          protect, authorize('admin'), exportUsersCSV);
router.post('/users/import',         protect, authorize('admin'), importUsersCSV);


// ── Public / Authenticated User Routes ────────────────────────────

// Any logged-in user can submit a responder application
// router.post('/applications', protect, submitApplication);


module.exports = router;