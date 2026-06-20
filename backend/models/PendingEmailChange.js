const mongoose = require('mongoose');

const pendingEmailChangeSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  newEmail: { type: String, required: true },
  code:     { type: String, required: true },
  expiresAt:{ type: Date,   required: true },
  createdAt:{ type: Date,   default: Date.now },
});

// Auto-delete expired records from MongoDB
pendingEmailChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingEmailChange', pendingEmailChangeSchema);