const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const ForumPost = require('../models/ForumPost');
const {
  getPosts,
  getPost,
  createPost,
  editPost,
  deletePost,
  likePost,
  addReply,
  deleteReply,
  likeReply,
  flagPost,
  verifyPost,
  reportPost,
  upload,
} = require('../controllers/forumController');

// Public / logged-in reads
router.get('/',    protect, getPosts);
router.get('/:id', protect, getPost);

// Create post — uses upload middleware to parse form-data before validating
router.post('/',
  protect,
  upload,
  validate([
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters.'),
    body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters.'),
    body('category')
      .trim()
      .toLowerCase()
      .isIn(['general', 'fire_safety', 'incident_reports', 'announcements', 'questions'])
      .withMessage('Invalid category.'),
  ]),
  createPost
);

router.put('/:id',                        protect, editPost);
router.delete('/:id',                     protect, deletePost);
router.post('/:id/like',                  protect, likePost);
router.post('/:id/replies',               protect, addReply);
router.delete('/:id/replies/:replyId',    protect, deleteReply);
router.post('/:id/replies/:replyId/like', protect, likeReply);
router.post('/:id/flag',                  protect, flagPost);
router.post('/:id/report',                protect, reportPost);

// Responder and admin only
router.put('/:id/verify', protect, authorize('responder', 'admin'), verifyPost);
router.put('/:id/unflag', protect, authorize('admin'), async (req, res) => {
  try {
    await ForumPost.findByIdAndUpdate(req.params.id, { isFlagged: false, reports: [] });
    res.json({ message: 'Post cleared.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;