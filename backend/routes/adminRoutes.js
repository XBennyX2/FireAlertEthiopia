const express = require('express');
const router  = express.Router();

// Middleware Imports
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const { submitApplication, getMyApplication } = require('../controllers/adminController');

// Note: these use protect only (any logged-in user), not authorize('admin')
router.post('/applications',      protect, submitApplication);
router.get('/applications/mine',  protect, getMyApplication);
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