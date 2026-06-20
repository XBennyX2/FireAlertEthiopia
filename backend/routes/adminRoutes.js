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
  getAnalytics
} = require('../controllers/adminController');

// ── Admin only routes ─────────────────────────────────────────────
router.get('/users',                     protect, authorize('admin'), getAllUsers);
router.put('/users/:id/role',            protect, authorize('admin'), changeUserRole);
router.put('/users/:id/status',          protect, authorize('admin'), toggleUserStatus);
router.get('/applications',              protect, authorize('admin'), getApplications);
router.put('/applications/:id/approve',  protect, authorize('admin'), approveApplication);
router.put('/applications/:id/reject',   protect, authorize('admin'), rejectApplication);
router.get('/logs',                      protect, authorize('admin'), getAuditLogs);
router.get('/analytics',                 protect, authorize('admin'), getAnalytics);

// Reputation adjustment routes
router.put('/users/:id/reputation',      protect, authorize('admin'), adjustReputation);
router.put('/users/:id/unban',           protect, authorize('admin'), unbanUser);

// ── Any logged-in user can submit a responder application ─────────
router.post('/applications', protect, submitApplication);

module.exports = router;