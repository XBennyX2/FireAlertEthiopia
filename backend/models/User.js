const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  role:             { type: String, enum: ['user', 'responder', 'admin'], default: 'user' },
  reputationScore:  { type: Number, default: 100 },
  falseReportCount: { type: Number, default: 0 },
  isActive:         { type: Boolean, default: true },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);