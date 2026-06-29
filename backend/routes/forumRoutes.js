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
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const forumStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/forum';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `forum-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const forumUpload = multer({
  storage: forumStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    ['.jpg','.jpeg','.png','.gif','.webp'].includes(ext) ? cb(null,true) : cb(new Error('Images only.'));
  },
}).single('image');

router.post('/', protect, (req, res, next) => forumUpload(req, res, next), createPost);
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
router.delete('/:id', protect, deletePost);
// Responder and admin only
router.put('/:id/verify', protect, authorize('responder', 'admin'), verifyPost);
router.post('/:id/report', protect, reportPost);
router.put('/:id/unflag', protect, authorize('admin'), async (req, res) => {
  try {
    await ForumPost.findByIdAndUpdate(req.params.id, { isFlagged: false, reports: [] });
    res.json({ message: 'Post cleared.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;