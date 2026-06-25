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
});

module.exports = mongoose.model('SafetyContent', safetyContentSchema);