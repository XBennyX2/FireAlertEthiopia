const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  statusHistory: [{
  status:    { type: String },
  timestamp: { type: Date, default: Date.now },
  note:      { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}],
rejectionReason: { type: String, default: '' },
resolvedAt:      { type: Date },

  description: {
    type: String,
    required: true
  },
  fire_type: {
    type: String,
    enum: ['residential', 'commercial', 'vehicle', 'industrial', 'wildland', 'other'],
    default: 'other'
  },
  location: {
    lat:     { type: Number, required: true },
    lng:     { type: Number, required: true },
    address: { type: String, default: '' }
  },
  mediaFiles: [{ type: String }],
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'dispatched', 'resolved', 'rejected'],
    default: 'pending'
  },
  ai_trust_score:  { type: Number },
  ai_risk_level:   { type: String },
  ai_flags:        [{ type: String }],
  is_duplicate:    { type: Boolean, default: false },
  duplicate_of:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Incident' }],
  assignedResponder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedAt:  { type: Date, default: Date.now },
  resolvedAt:  { type: Date }
});

module.exports = mongoose.model('Incident', incidentSchema);