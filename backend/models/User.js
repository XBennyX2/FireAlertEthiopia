const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  normalizedEmail: { type: String, default: '', index: true },
  registrationIp:  { type: String, default: '' },
  password:         { type: String, required: true },
  phone:            { type: String, default: '' },
  profilePhoto:     { type: String, default: '' },
  role:             { type: String, enum: ['user', 'responder', 'admin'], default: 'user' },
  reputationScore:  { type: Number, default: 100 },
  falseReportCount: { type: Number, default: 0 },
  isActive:         { type: Boolean, default: true },
  isBanned:         { type: Boolean, default: false },
  isRestricted:     { type: Boolean, default: false },
  isVerified:       { type: Boolean, default: true },   // ← new
  language:         { type: String, enum: ['en', 'am'], default: 'en' },
  createdAt:        { type: Date, default: Date.now },
  lastLogin:        { type: Date },
  loginAttempts:    { type: Number, default: 0 },
  lockUntil:        { type: Date },
  googleId:         { type: String, default: '' },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorVerified:{ type: Boolean, default: false },
  notificationPrefs: {
    emailOnVerified:   { type: Boolean, default: true },
    emailOnDispatched: { type: Boolean, default: true },
    emailOnResolved:   { type: Boolean, default: true },
    emailOnRejected:   { type: Boolean, default: true },
    pushEnabled:       { type: Boolean, default: true },
  },
  station: {
    type:    String,
    default: 'Unassigned',
    trim:    true,
  },
  shiftSchedule: [{
    day:       { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    startTime: { type: String }, // "08:00"
    endTime:   { type: String }, // "16:00"
    station: {
      type: String,
      enum: [
        'Bole Fire Station',
        'Kirkos Fire Station',
        'Yeka Fire Station',
        'Arada Fire Station',
        'Akaki Kaliti Fire Station',
        'Nifas Silk-Lafto Fire Station',
        'Gulele Fire Station',
        'Lideta Fire Station',
        'Kolfe Keranio Fire Station',
        'Addis Ketema Fire Station',
        'Unassigned',
      ],
      default: 'Unassigned',
    },
  }],
});

module.exports = mongoose.model('User', userSchema);