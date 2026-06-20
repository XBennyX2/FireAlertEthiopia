const ForumPost = require('../models/ForumPost');
const AuditLog  = require('../models/AuditLog');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');

// ── Multer for post images ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/forum/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `forum-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
}).single('image');

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ── GET /api/forum — get all posts ───────────────────────────────
const getPosts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const query = { isRemoved: false };

    if (category) query.category = category;
    if (search)   query.$or = [
      { title:   { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];

    const total = await ForumPost.countDocuments(query);
    const posts = await ForumPost.find(query)
      .populate('author', 'name profilePhoto reputationScore')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-replies');

    res.json({ posts, total, page: parseInt(page), pages: Math.ceil(total / limit) });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/forum/:id — get single post with replies ────────────
const getPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author',         'name profilePhoto reputationScore role')
      .populate('replies.author', 'name profilePhoto role');

    if (!post || post.isRemoved) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/forum — create post ────────────────────────────────
const createPost = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const { title, content, category } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ message: 'Title must be under 200 characters' });
    }

    try {
      const post = await ForumPost.create({
        author:   req.user._id,
        title:    title.trim(),
        content:  content.trim(),
        category: category || 'general',
        image:    req.file ? `http://localhost:5000/${req.file.path}` : '',
      });

      const populated = await ForumPost.findById(post._id)
        .populate('author', 'name profilePhoto reputationScore');

      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

// ── PUT /api/forum/:id — edit post ───────────────────────────────
const editPost = async (req, res) => {
  const { title, content } = req.body;

  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post || post.isRemoved) return res.status(404).json({ message: 'Post not found' });

    // Only author can edit and only within 15 minutes
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    const ageMs = Date.now() - new Date(post.createdAt).getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      return res.status(400).json({ message: 'Posts can only be edited within 15 minutes of posting' });
    }

    if (title)   post.title   = title.trim();
    if (content) post.content = content.trim();
    post.editedAt = new Date();
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/forum/:id — delete own post ───────────────────────
const deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin  = ['admin', 'responder'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'You cannot delete this post' });
    }

    post.isRemoved = true;
    await post.save();

    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/forum/:id/like — toggle like on post ───────────────
const likePost = async (req, res) => {
  try {
    const post    = await ForumPost.findById(req.params.id);
    if (!post || post.isRemoved) return res.status(404).json({ message: 'Post not found' });

    const userId  = req.user._id.toString();
    const hasLiked = post.likes.map(l => l.toString()).includes(userId);

    if (hasLiked) {
      post.likes = post.likes.filter(l => l.toString() !== userId);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    res.json({ liked: !hasLiked, likeCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/forum/:id/replies — add reply ──────────────────────
const addReply = async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ message: 'Reply content is required' });
  }

  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post || post.isRemoved) return res.status(404).json({ message: 'Post not found' });

    post.replies.push({ author: req.user._id, content: content.trim() });
    await post.save();

    // Notify the post author if someone else replied
    if (post.author.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      if (io) {
        io.to(post.author.toString()).emit('forumReply', {
          postId:     post._id,
          postTitle:  post.title,
          repliedBy:  req.user.name,
          message:    `${req.user.name} replied to your post: "${post.title}"`,
          timestamp:  new Date().toISOString(),
        });
      }
    }

    const updated = await ForumPost.findById(post._id)
      .populate('replies.author', 'name profilePhoto role');

    res.status(201).json(updated.replies[updated.replies.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/forum/:id/replies/:replyId — delete reply ────────
const deleteReply = async (req, res) => {
  try {
    const post  = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const reply = post.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    const isAuthor = reply.author.toString() === req.user._id.toString();
    const isMod    = ['admin', 'responder'].includes(req.user.role);

    if (!isAuthor && !isMod) {
      return res.status(403).json({ message: 'You cannot delete this reply' });
    }

    reply.isRemoved = true;
    reply.content   = '[Reply removed]';
    await post.save();

    res.json({ message: 'Reply removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/forum/:id/replies/:replyId/like — like a reply ─────
const likeReply = async (req, res) => {
  try {
    const post  = await ForumPost.findById(req.params.id);
    const reply = post?.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    const userId   = req.user._id.toString();
    const hasLiked = reply.likes.map(l => l.toString()).includes(userId);

    if (hasLiked) {
      reply.likes = reply.likes.filter(l => l.toString() !== userId);
    } else {
      reply.likes.push(req.user._id);
    }

    await post.save();
    res.json({ liked: !hasLiked, likeCount: reply.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/forum/:id/flag — flag post for moderation ──────────
const flagPost = async (req, res) => {
  const { reason } = req.body;
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.isFlagged  = true;
    post.flagReason = reason || 'Reported by user';
    await post.save();

    res.json({ message: 'Post flagged for moderation review' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PUT /api/forum/:id/verify — add verified badge (responder+) ──
const verifyPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.isVerified = !post.isVerified;
    post.isFlagged  = false;
    await post.save();

    res.json({ message: post.isVerified ? 'Post verified' : 'Verification removed', post });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};