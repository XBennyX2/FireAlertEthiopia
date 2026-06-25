const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastActive:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
