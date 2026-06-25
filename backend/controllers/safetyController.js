const SafetyContent = require('../models/SafetyContent');
const AuditLog      = require('../models/AuditLog');

async function log(adminId, action, details) {
  try { await AuditLog.create({ performedBy: adminId, action, details }); } catch {}
}

// GET /api/safety — public, returns all approved content
const getPublicContent = async (req, res) => {
  try {
    const { category, language } = req.query;
    const query = { status: 'approved' };
    if (category) query.category = category;
    if (language) query.language = language;

    const content = await SafetyContent.find(query)
      .populate('author', 'name role')
      .sort({ isPinned: -1, publishedAt: -1 });

    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/safety/pending — admin only
const getPendingContent = async (req, res) => {
  try {
    const content = await SafetyContent.find({ status: 'pending_review' })
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/safety/mine — responder sees their own submissions
const getMyContent = async (req, res) => {
  try {
    const content = await SafetyContent.find({ author: req.user._id })
      .sort({ createdAt: -1 });
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/safety — responder or admin creates content
const createContent = async (req, res) => {
  try {
    const { title, body, category, language } = req.body;

    if (!title?.trim() || !body?.trim() || !category) {
      return res.status(400).json({ message: 'Title, body, and category are required.' });
    }

    const content = await SafetyContent.create({
      title:    title.trim(),
      body:     body.trim(),
      category,
      language: language || 'en',
      author:   req.user._id,
      status:   req.user.role === 'admin' ? 'approved' : 'pending_review',
      publishedAt: req.user.role === 'admin' ? new Date() : undefined,
    });

    if (req.user.role !== 'admin') {
      await log(req.user._id, 'SAFETY_CONTENT_SUBMITTED', `${req.user.name} submitted safety content: "${title}"`);
    }

    res.status(201).json({ message: 'Content submitted for review.', content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/safety/:id — author edits their own draft/pending content
const updateContent = async (req, res) => {
  try {
    const content = await SafetyContent.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found.' });

    const isAuthor = content.author.toString() === req.user._id.toString();
    const isAdmin  = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) return res.status(403).json({ message: 'Access denied.' });
    if (!isAdmin && content.status === 'approved') {
      return res.status(400).json({ message: 'Approved content cannot be edited.' });
    }

    const { title, body, category, language } = req.body;
    if (title)    content.title    = title.trim();
    if (body)     content.body     = body.trim();
    if (category) content.category = category;
    if (language) content.language = language;
    content.updatedAt = new Date();
    if (!isAdmin) content.status = 'pending_review';

    await content.save();
    res.json({ message: 'Content updated.', content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/safety/:id/approve — admin approves
const approveContent = async (req, res) => {
  try {
    const content = await SafetyContent.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found.' });

    content.status      = 'approved';
    content.reviewedBy  = req.user._id;
    content.reviewedAt  = new Date();
    content.publishedAt = new Date();
    await content.save();

    await log(req.user._id, 'SAFETY_CONTENT_APPROVED', `Approved safety content: "${content.title}"`);

    res.json({ message: 'Content approved and published.', content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/safety/:id/reject — admin rejects
const rejectContent = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const content = await SafetyContent.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found.' });

    content.status          = 'rejected';
    content.reviewedBy      = req.user._id;
    content.reviewedAt      = new Date();
    content.rejectionReason = rejectionReason || '';
    await content.save();

    await log(req.user._id, 'SAFETY_CONTENT_REJECTED', `Rejected safety content: "${content.title}"`);

    res.json({ message: 'Content rejected.', content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/safety/:id/pin — admin toggles pin
const togglePin = async (req, res) => {
  try {
    const content = await SafetyContent.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found.' });

    content.isPinned = !content.isPinned;
    await content.save();

    res.json({ message: `Content ${content.isPinned ? 'pinned' : 'unpinned'}.`, content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/safety/:id — admin or author (if draft)
const deleteContent = async (req, res) => {
  try {
    const content = await SafetyContent.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found.' });

    const isAuthor = content.author.toString() === req.user._id.toString();
    const isAdmin  = req.user.role === 'admin';

    if (!isAdmin && !isAuthor) return res.status(403).json({ message: 'Access denied.' });
    if (!isAdmin && content.status === 'approved') {
      return res.status(400).json({ message: 'Cannot delete approved content.' });
    }

    await SafetyContent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Content deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicContent, getPendingContent, getMyContent,
  createContent, updateContent, approveContent,
  rejectContent, togglePin, deleteContent,
};