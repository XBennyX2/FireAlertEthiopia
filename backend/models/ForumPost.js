const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true },
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isRemoved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  editedAt:  { type: Date },
});

const forumPostSchema = new mongoose.Schema({
  author:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['general', 'fire_safety', 'incident_reports', 'announcements', 'questions'],
    default: 'general',
  },
  title:        { type: String, required: true, maxlength: 200 },
  content:      { type: String, required: true },
  image:        { type: String, default: '' },
  likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies:      [replySchema],
  isRemoved:    { type: Boolean, default: false },
  isPinned:     { type: Boolean, default: false },
  isVerified:   { type: Boolean, default: false },
  isFlagged:    { type: Boolean, default: false },
  flagReason:   { type: String,  default: '' },
  views:        { type: Number,  default: 0 },
  createdAt:    { type: Date,    default: Date.now },
  editedAt:     { type: Date },
});

module.exports = mongoose.model('ForumPost', forumPostSchema);