const Incident = require('../models/Incident');
const User     = require('../models/User');
const axios    = require('axios');
const { updateReputationScore } = require('../utils/reputationManager');

// ── Helper: emit socket event to reporter ─────────────────────────
function notifyReporter(req, incident, eventType, message) {
  const io         = req.app.get('io');
  const reporterId = incident.reportedBy?.toString();
  if (!io || !reporterId) return;

  io.to(reporterId).emit(eventType, {
    incidentId: incident._id,
    eventType,
    message,
    status:     incident.status,
    timestamp:  new Date().toISOString(),
  });

  io.emit('incidentUpdate', {
    incidentId: incident._id,
    message,
    status:     incident.status,
    timestamp:  new Date().toISOString(),
  });
}

// GET /api/responder/incidents
const getIncidentQueue = async (req, res) => {
  try {
    const incidents = await Incident.find({
      status: { $in: ['pending', 'verified', 'dispatched'] }
    })
      .populate('reportedBy', 'name email reputationScore')
      .sort({ reportedAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/verify
const verifyIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reportedBy');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    if (incident.status !== 'pending') return res.status(400).json({ message: 'Incident is not pending' });

    incident.status = 'verified';
    incident.statusHistory = incident.statusHistory || [];
    incident.statusHistory.push({
      status:    'verified',
      timestamp: new Date(),
      note:      req.body.note || '',
      updatedBy: req.user._id,
    });
    await incident.save();

    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('verified', {
        message:    'Your incident report has been verified by a responder.',
        incidentId: incident._id.toString(),
      });
    }

    await updateReporterReputation(incident.reportedBy, 'verified');

    res.json({ message: 'Incident verified', incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/dispatch
const dispatchIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reportedBy');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    if (incident.status !== 'verified') return res.status(400).json({ message: 'Only verified incidents can be dispatched' });

    incident.status = 'dispatched';
    incident.statusHistory = incident.statusHistory || [];
    incident.statusHistory.push({
      status:    'dispatched',
      timestamp: new Date(),
      note:      req.body.note || '',
      updatedBy: req.user._id,
    });
    await incident.save();

    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('dispatched', {
        message:    'A fire responder has been dispatched to your reported incident.',
        incidentId: incident._id.toString(),
      });
    }

    res.json({ message: 'Responders dispatched', incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/resolve
const resolveIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reportedBy');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    if (incident.status !== 'dispatched') return res.status(400).json({ message: 'Only dispatched incidents can be resolved' });

    incident.status     = 'resolved';
    incident.resolvedAt = new Date();
    incident.statusHistory = incident.statusHistory || [];
    incident.statusHistory.push({
      status:    'resolved',
      timestamp: new Date(),
      note:      req.body.note || '',
      updatedBy: req.user._id,
    });
    await incident.save();

    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('resolved', {
        message:    'Your reported incident has been resolved.',
        incidentId: incident._id.toString(),
      });
    }

    const result = await updateReputationScore(incident.reportedBy, 'verified');

    res.json({
      message:          'Incident resolved',
      incident,
      reporterNewScore: result?.score,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/reject
const rejectIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reportedBy');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    if (incident.status !== 'pending') return res.status(400).json({ message: 'Only pending incidents can be rejected' });

    incident.status          = 'rejected';
    incident.rejectionReason = req.body.rejectionReason || req.body.note || '';
    incident.statusHistory   = incident.statusHistory || [];
    incident.statusHistory.push({
      status:    'rejected',
      timestamp: new Date(),
      note:      req.body.rejectionReason || req.body.note || '',
      updatedBy: req.user._id,
    });
    await incident.save();

    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('rejected', {
        message:    'Your incident report was reviewed and could not be verified.',
        incidentId: incident._id.toString(),
      });
    }

    const result = await updateReputationScore(incident.reportedBy, 'false_report');

    await User.findByIdAndUpdate(incident.reportedBy, {
      $inc: { falseReportCount: 1 }
    });

    res.json({
      message:          'Incident rejected',
      incident,
      reporterNewScore: result?.score,
      reporterStatus: {
        isBanned:     result?.isBanned,
        isRestricted: result?.isRestricted,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getIncidentQueue,
  verifyIncident,
  dispatchIncident,
  resolveIncident,
  rejectIncident,
};