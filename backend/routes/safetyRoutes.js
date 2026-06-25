const express  = require('express');
const router   = express.Router();
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getPublicContent, getPendingContent, getMyContent,
  createContent, updateContent, approveContent,
  rejectContent, togglePin, deleteContent,
} = require('../controllers/safetyController');

router.get('/',                   getPublicContent);   // public
router.get('/pending',            protect, authorize('admin'), getPendingContent);
router.get('/mine',               protect, authorize('responder','admin'), getMyContent);
router.post('/',                  protect, authorize('responder','admin'), createContent);
router.put('/:id',                protect, authorize('responder','admin'), updateContent);
router.put('/:id/approve',        protect, authorize('admin'), approveContent);
router.put('/:id/reject',         protect, authorize('admin'), rejectContent);
router.put('/:id/pin',            protect, authorize('admin'), togglePin);
router.delete('/:id',             protect, authorize('responder','admin'), deleteContent);

module.exports = router;