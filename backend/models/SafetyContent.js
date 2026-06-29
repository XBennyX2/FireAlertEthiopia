const mongoose = require('mongoose');

const safetyContentSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  body:        { type: String, required: true },
  category: {
    type: String,
    enum: ['prevention', 'emergency_procedure', 'preparedness', 'contact'],
    required: true,
  },
  language:    { type: String, enum: ['en', 'am'], default: 'en' },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected'],
    default: 'draft',
  },
  reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:      { type: Date },
  rejectionReason: { type: String },
  publishedAt:     { type: Date },
  isPinned:        { type: Boolean, default: false },
  imageUrl:        { type: String },
  createdAt:       { type: Date, default: Date.now },
  updatedAt:       { type: Date, default: Date.now },
  viewCount: { type: Number, default: 0 },
  scheduledFor: { type: Date }, // if set, auto-publish at this tim
});

// PUT /api/safety/:id/view — increment view count (public)
const recordView = async (req, res) => {
  try {
    await SafetyContent.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
};

module.exports = mongoose.model('SafetyContent', safetyContentSchema);