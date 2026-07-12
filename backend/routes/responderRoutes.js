const express = require('express');
const router  = express.Router();

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const User = require('../models/User');
const {
  getIncidentQueue,
  verifyIncident,
  dispatchIncident,
  resolveIncident,
  rejectIncident,
  requestInfo,
  reassignIncident,
  getMyPerformance,
  getLeaderboard,
  getShift,
  updateShift
} = require('../controllers/responderController');

// All routes require login AND responder or admin role
router.get('/incidents',              protect, authorize('responder', 'admin'), getIncidentQueue);
router.put('/incidents/:id/verify',   protect, authorize('responder', 'admin'), verifyIncident);
router.put('/incidents/:id/dispatch', protect, authorize('responder', 'admin'), dispatchIncident);
router.put('/incidents/:id/resolve',  protect, authorize('responder', 'admin'), resolveIncident);
router.put('/incidents/:id/reject',   protect, authorize('responder', 'admin'), rejectIncident);
router.post('/incidents/:id/request-info', protect, authorize('responder','admin'), requestInfo);
router.put('/incidents/:id/reassign', protect, authorize('admin'), reassignIncident);
router.get('/my-performance', protect, authorize('responder','admin'), getMyPerformance);
router.get('/leaderboard', protect, authorize('responder','admin'), getLeaderboard);
router.get('/shift',  protect, authorize('responder','admin'), getShift);
router.put('/shift',  protect, authorize('responder','admin'), updateShift);
// GET /api/responder/my-station
router.get('/my-station', protect, authorize('responder', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('station name');
    res.json({ station: user.station || 'Unassigned' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;