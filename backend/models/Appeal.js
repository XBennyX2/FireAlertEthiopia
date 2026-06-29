const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:    { type: String, required: true },
  status:    { type: String, enum: ['pending','approved','denied'], default: 'pending' },
  adminNote: { type: String, default: '' },
  reviewedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Appeal', appealSchema);