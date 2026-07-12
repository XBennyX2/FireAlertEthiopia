const express = require('express');
const router  = express.Router();

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  getAllUsers,
  changeUserRole,
  toggleUserStatus,
  getApplications,
  submitApplication,
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
  importUsersCSV,
  getUserDetail,
  bulkMessage,
  getResponderPerformance,
  getMyApplication,
  assignStation,
} = require('../controllers/adminController');

const Appeal = require('../models/Appeal');
const { applyReputationConsequences } = require('../utils/reputationManager');

// ── Public / any logged-in user ───────────────────────────────────
router.post('/applications',     protect, submitApplication);
router.get('/applications/mine', protect, getMyApplication);

// ── Admin-only: Users ─────────────────────────────────────────────
// IMPORTANT: specific paths like /users/export must come BEFORE /users/:id
router.get('/users/export',          protect, authorize('admin'), exportUsersCSV);
router.post('/users/import',         protect, authorize('admin'), importUsersCSV);
router.get('/users',                 protect, authorize('admin'), getAllUsers);
router.get('/users/:id/detail',      protect, authorize('admin'), getUserDetail);
router.put('/users/:id/role',        protect, authorize('admin'), changeUserRole);
router.put('/users/:id/status',      protect, authorize('admin'), toggleUserStatus);
router.put('/users/:id/unban',       protect, authorize('admin'), unbanUser);
router.put('/users/:id/reputation',  protect, authorize('admin'), adjustReputation);
router.put('/users/:id/station',     protect, authorize('admin'), assignStation);

// ── Admin-only: Applications ──────────────────────────────────────
router.get('/applications',              protect, authorize('admin'), getApplications);
router.put('/applications/:id/approve',  protect, authorize('admin'), approveApplication);
router.put('/applications/:id/reject',   protect, authorize('admin'), rejectApplication);

// ── Admin-only: Appeals ───────────────────────────────────────────
router.get('/appeals', protect, authorize('admin'), async (req, res) => {
  try {
    const appeals = await Appeal.find({ status: 'pending' })
      .populate('userId', 'name email reputationScore isBanned')
      .sort({ createdAt: -1 });
    res.json(appeals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/appeals/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.id).populate('userId');
    if (!appeal) return res.status(404).json({ message: 'Appeal not found.' });
    await applyReputationConsequences(appeal.userId._id, 65);
    appeal.status     = 'approved';
    appeal.reviewedBy = req.user._id;
    await appeal.save();
    res.json({ message: 'Appeal approved. User unbanned.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Admin-only: Logs & Analytics ──────────────────────────────────
router.get('/audit-logs',            protect, authorize('admin'), getAuditLogs);
router.get('/audit-logs/export',     protect, authorize('admin'), exportAuditLogsCSV);
router.get('/analytics',             protect, authorize('admin'), getAnalytics);
router.get('/analytics/export/csv',  protect, authorize('admin'), exportAnalyticsCSV);
router.get('/analytics/export/pdf',  protect, authorize('admin'), exportAnalyticsPDF);

// ── Admin-only: Other ─────────────────────────────────────────────
router.post('/bulk-message',         protect, authorize('admin'), bulkMessage);
router.get('/responder-performance', protect, authorize('admin'), getResponderPerformance);

module.exports = router;