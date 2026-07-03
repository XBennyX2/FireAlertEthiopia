const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true, maxlength: 1000 },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, read: 1 }); // for unread count queries

module.exports = mongoose.model('Message', messageSchema);