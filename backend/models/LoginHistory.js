const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  method:    { type: String, enum: ['email','google','2fa'], default: 'email' },
  success:   { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

loginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90-day TTL

module.exports = mongoose.model('LoginHistory', loginHistorySchema);