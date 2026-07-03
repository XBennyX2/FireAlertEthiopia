const Incident = require('../models/Incident');
const User     = require('../models/User');
const axios    = require('axios');
const { updateReputationScore } = require('../utils/reputationManager');
const { sendStatusUpdateEmail } = require('../utils/emailService');
const { sendPushToUser }        = require('../utils/pushNotification');

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

    // 1. Socket Notification
    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('verified', {
        message:    'Your incident report has been verified by a responder.',
        incidentId: incident._id.toString(),
      });
    }

    // 2. Email Notification with user preference guard
    const prefs = incident.reportedBy?.notificationPrefs;
    if (prefs?.emailOnVerified !== false && incident.reportedBy?.email) {
      sendStatusUpdateEmail(
        incident.reportedBy.email,
        incident.reportedBy.name,
        'verified',
        incident.fire_type,
        incident._id,
      ).catch(err => console.error('Status email error:', err.message));
    }

    // 3. Push Notification
    if (incident.reportedBy?._id) {
      sendPushToUser(incident.reportedBy._id.toString(), {
        title:  'FireAlert Update',
        body:   `Your report has been verified`,
        url:    `/incidents/${incident._id}`,
      }).catch(err => console.error('Push notification error:', err.message));
    }

    // Note: Ensure updateReporterReputation is imported or defined if used here
    if (typeof updateReporterReputation === 'function') {
      await updateReporterReputation(incident.reportedBy, 'verified');
    }

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

    // 1. Socket Notification
    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('dispatched', {
        message:    'A fire responder has been dispatched to your reported incident.',
        incidentId: incident._id.toString(),
      });
    }

    // 2. Email Notification with user preference guard
    const prefs = incident.reportedBy?.notificationPrefs;
    if (prefs?.emailOnDispatched !== false && incident.reportedBy?.email) {
      sendStatusUpdateEmail(
        incident.reportedBy.email,
        incident.reportedBy.name,
        'dispatched',
        incident.fire_type,
        incident._id,
      ).catch(err => console.error('Status email error:', err.message));
    }

    // 3. Push Notification
    if (incident.reportedBy?._id) {
      sendPushToUser(incident.reportedBy._id.toString(), {
        title:  'FireAlert Update',
        body:   `Your report has been dispatched`,
        url:    `/incidents/${incident._id}`,
      }).catch(err => console.error('Push notification error:', err.message));
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

    // 1. Socket Notification
    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('resolved', {
        message:    'Your reported incident has been resolved.',
        incidentId: incident._id.toString(),
      });
    }

    // 2. Email Notification with user preference guard
    const prefs = incident.reportedBy?.notificationPrefs;
    if (prefs?.emailOnResolved !== false && incident.reportedBy?.email) {
      sendStatusUpdateEmail(
        incident.reportedBy.email,
        incident.reportedBy.name,
        'resolved',
        incident.fire_type,
        incident._id,
      ).catch(err => console.error('Status email error:', err.message));
    }

    // 3. Push Notification
    if (incident.reportedBy?._id) {
      sendPushToUser(incident.reportedBy._id.toString(), {
        title:  'FireAlert Update',
        body:   `Your report has been resolved`,
        url:    `/incidents/${incident._id}`,
      }).catch(err => console.error('Push notification error:', err.message));
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

    // 1. Socket Notification
    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('rejected', {
        message:    'Your incident report was reviewed and could not be verified.',
        incidentId: incident._id.toString(),
      });
    }

    // 2. Email Notification with user preference guard
    const prefs = incident.reportedBy?.notificationPrefs;
    if (prefs?.emailOnRejected !== false && incident.reportedBy?.email) {
      sendStatusUpdateEmail(
        incident.reportedBy.email,
        incident.reportedBy.name,
        'rejected',
        incident.fire_type,
        incident._id,
      ).catch(err => console.error('Status email error:', err.message));
    }

    // 3. Push Notification
    if (incident.reportedBy?._id) {
      sendPushToUser(incident.reportedBy._id.toString(), {
        title:  'FireAlert Update',
        body:   `Your report has been rejected`,
        url:    `/incidents/${incident._id}`,
      }).catch(err => console.error('Push notification error:', err.message));
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

const requestInfo = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required.' });

    const incident = await Incident.findById(req.params.id).populate('reportedBy');
    if (!incident) return res.status(404).json({ message: 'Incident not found.' });

    incident.infoRequests = incident.infoRequests || [];
    incident.infoRequests.push({
      message: message.trim(),
      requestedBy: req.user._id,
      requestedAt: new Date(),
    });
    await incident.save();

    // Notify reporter via Socket.io
    const io = req.app.get('io');
    if (io && incident.reportedBy?._id) {
      io.to(incident.reportedBy._id.toString()).emit('infoRequest', {
        message:    `A responder is requesting more information about your report: "${message}"`,
        incidentId: incident._id.toString(),
      });
    }

    res.json({ message: 'Info request sent to reporter.', incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reassignIncident = async (req, res) => {
  try {
    const { responderId } = req.body;
    if (!responderId) return res.status(400).json({ message: 'Responder ID required.' });

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found.' });

    const responder = await User.findById(responderId);
    if (!responder || responder.role !== 'responder') {
      return res.status(400).json({ message: 'Invalid responder.' });
    }

    incident.assignedTo = responderId;
    incident.statusHistory = incident.statusHistory || [];
    incident.statusHistory.push({
      status:    incident.status,
      timestamp: new Date(),
      note:      `Reassigned to ${responder.name}`,
      updatedBy: req.user._id,
    });
    await incident.save();

    res.json({ message: `Incident reassigned to ${responder.name}.`, incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyPerformance = async (req, res) => {
  try {
    const responderId = req.user._id;

    const allIncidents = await Incident.find({
      $or: [
        { assignedTo: responderId },
        { 'statusHistory.updatedBy': responderId },
      ]
    });

    const resolved   = allIncidents.filter(i => i.status === 'resolved');
    const rejected   = allIncidents.filter(i => i.status === 'rejected');
    const dispatched = allIncidents.filter(i => ['dispatched','resolved'].includes(i.status));

    // Average response time (report to dispatch)
    let totalResponseMs = 0;
    let responseCount   = 0;
    dispatched.forEach(i => {
      const dispatchEntry = i.statusHistory?.find(h => h.status === 'dispatched');
      if (dispatchEntry) {
        totalResponseMs += new Date(dispatchEntry.timestamp) - new Date(i.reportedAt);
        responseCount++;
      }
    });

    const avgResponseMinutes = responseCount > 0
      ? Math.round(totalResponseMs / responseCount / 60000)
      : 0;

    res.json({
      totalHandled:       allIncidents.length,
      resolved:           resolved.length,
      rejected:           rejected.length,
      dispatched:         dispatched.length,
      avgResponseMinutes,
      resolutionRate:     allIncidents.length > 0
        ? ((resolved.length / allIncidents.length) * 100).toFixed(1)
        : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const responders = await User.find({ role: 'responder', isActive: true })
      .select('name profilePhoto reputationScore');

    // Count resolved incidents per responder
    const counts = await Incident.aggregate([
      { $match: { status: 'resolved' } },
      { $unwind: '$statusHistory' },
      { $match: { 'statusHistory.status': 'resolved' } },
      { $group: { _id: '$statusHistory.updatedBy', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach(c => { if (c._id) countMap[c._id.toString()] = c.count; });

    const board = responders.map(r => ({
      _id:            r._id,
      name:           r.name,
      profilePhoto:   r.profilePhoto,
      reputationScore:r.reputationScore,
      resolvedCount:  countMap[r._id.toString()] || 0,
    })).sort((a, b) => b.resolvedCount - a.resolvedCount || b.reputationScore - a.reputationScore)
      .slice(0, 20);

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShift = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('shiftSchedule isOnDuty');
    res.json({ shiftSchedule: user.shiftSchedule || [], isOnDuty: user.isOnDuty || false });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateShift = async (req, res) => {
  try {
    const { shiftSchedule } = req.body;
    await User.findByIdAndUpdate(req.user._id, { shiftSchedule });
    res.json({ message: 'Shift schedule updated.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  getIncidentQueue,
  verifyIncident,
  dispatchIncident,
  resolveIncident,
  rejectIncident,
  requestInfo,
  reassignIncident,
  getMyPerformance,
  getLeaderboard,
  getShift,
  updateShift
};