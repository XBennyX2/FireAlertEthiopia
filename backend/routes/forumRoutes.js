const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
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
} = require('../controllers/forumController');

// Public — anyone can read
router.get('/',    protect, getPosts);
router.get('/:id', protect, getPost);

// Logged-in users
router.post('/',                                    protect, createPost);
router.put('/:id',                                  protect, editPost);
router.delete('/:id',                               protect, deletePost);
router.post('/:id/like',                            protect, likePost);
router.post('/:id/replies',                         protect, addReply);
router.delete('/:id/replies/:replyId',              protect, deleteReply);
router.post('/:id/replies/:replyId/like',           protect, likeReply);
router.post('/:id/flag',                            protect, flagPost);

// Responder and admin only
router.put('/:id/verify', protect, authorize('responder', 'admin'), verifyPost);

module.exports = router;