const express = require('express');
const router  = express.Router();

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getIncidentQueue,
  verifyIncident,
  dispatchIncident,
  resolveIncident,
  rejectIncident
} = require('../controllers/responderController');

// All routes require login AND responder or admin role
router.get('/incidents',              protect, authorize('responder', 'admin'), getIncidentQueue);
router.put('/incidents/:id/verify',   protect, authorize('responder', 'admin'), verifyIncident);
router.put('/incidents/:id/dispatch', protect, authorize('responder', 'admin'), dispatchIncident);
router.put('/incidents/:id/resolve',  protect, authorize('responder', 'admin'), resolveIncident);
router.put('/incidents/:id/reject',   protect, authorize('responder', 'admin'), rejectIncident);

module.exports = router;