const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  phone:            { type: String, default: '' },
  profilePhoto:     { type: String, default: '' },
  role:             { type: String, enum: ['user', 'responder', 'admin'], default: 'user' },
  reputationScore:  { type: Number, default: 100 },
  falseReportCount: { type: Number, default: 0 },
  isActive:         { type: Boolean, default: true },
  isBanned:         { type: Boolean, default: false },
  isRestricted:     { type: Boolean, default: false },
  language:         { type: String, enum: ['en', 'am'], default: 'en' },
  createdAt:        { type: Date, default: Date.now },
  lastLogin:        { type: Date },
  loginAttempts:    { type: Number, default: 0 },
  lockUntil:        { type: Date },
});

module.exports = mongoose.model('User', userSchema);