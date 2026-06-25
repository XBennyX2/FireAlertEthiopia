const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name:  { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },

  // Professional background
  yearsExperience:   { type: Number, required: true, min: 0 },
  previousTraining:  { type: String },
  currentOccupation: { type: String },

  // Assignment preferences
  preferredStation: { type: String, required: true },
  availability: {
    type: String,
    enum: ['full_time', 'part_time', 'on_call', 'weekends_only'],
    required: true
  },

  // Motivation
  motivation: { type: String, required: true },

  // Decision tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:      { type: Date },
  rejectionReason: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);