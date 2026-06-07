const Incident = require('../models/Incident');
const User     = require('../models/User');

// ── Helper: emit a socket event to the incident reporter ─────────
function notifyReporter(req, incident, eventType, message) {
  const io = req.app.get('io');
  if (!io) return;

  const reporterId = incident.reportedBy?.toString();
  if (!reporterId) return;

  // Emit to the reporter's private room
  io.to(reporterId).emit(eventType, {
    incidentId:  incident._id,
    eventType,
    message,
    status:      incident.status,
    timestamp:   new Date().toISOString()
  });

  // Also emit a general incidentUpdate event for admin/responder dashboards
  io.emit('incidentUpdate', {
    incidentId: incident._id,
    message,
    status:     incident.status,
    timestamp:  new Date().toISOString()
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
    console.error('Get queue error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/verify
const verifyIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending incidents can be verified' });
    }

    incident.status            = 'verified';
    incident.assignedResponder = req.user._id;
    await incident.save();

    notifyReporter(
      req, incident, 'verified',
      'Your fire report has been verified by a responder.'
    );

    res.json({ message: 'Incident verified', incident });

  } catch (error) {
    console.error('Verify error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/dispatch
const dispatchIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'verified') {
      return res.status(400).json({ message: 'Only verified incidents can be dispatched' });
    }

    incident.status = 'dispatched';
    await incident.save();

    notifyReporter(
      req, incident, 'dispatched',
      'Fire units have been dispatched to your reported location.'
    );

    res.json({ message: 'Incident dispatched', incident });

  } catch (error) {
    console.error('Dispatch error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/resolve
const resolveIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'dispatched') {
      return res.status(400).json({ message: 'Only dispatched incidents can be resolved' });
    }

    incident.status     = 'resolved';
    incident.resolvedAt = new Date();
    await incident.save();

    // Reward the reporter
    await User.findByIdAndUpdate(incident.reportedBy, {
      $inc: { reputationScore: 10 }
    });

    notifyReporter(
      req, incident, 'resolved',
      'The fire incident you reported has been fully resolved. Thank you.'
    );

    res.json({ message: 'Incident resolved', incident });

  } catch (error) {
    console.error('Resolve error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/responder/incidents/:id/reject
const rejectIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending incidents can be rejected' });
    }

    incident.status = 'rejected';
    await incident.save();

    // Penalise the reporter
    await User.findByIdAndUpdate(incident.reportedBy, {
      $inc: { reputationScore: -15 }
    });

    notifyReporter(
      req, incident, 'rejected',
      'Your fire report was reviewed and could not be verified.'
    );

    res.json({ message: 'Incident rejected', incident });

  } catch (error) {
    console.error('Reject error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getIncidentQueue,
  verifyIncident,
  dispatchIncident,
  resolveIncident,
  rejectIncident
};