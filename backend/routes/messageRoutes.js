const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getResponders, getThread, getConversations,
  sendMessage, getUnreadCount,
} = require('../controllers/messageController');

// All routes require login; responders and admins only for most
router.get('/responders',      protect, authorize('responder', 'admin'), getResponders);
router.get('/conversations',   protect, authorize('responder', 'admin'), getConversations);
router.get('/unread-count',    protect, authorize('responder', 'admin'), getUnreadCount);
router.get('/thread/:userId',  protect, authorize('responder', 'admin'), getThread);
router.post('/',               protect, authorize('responder', 'admin'), sendMessage);

module.exports = router;