const crypto = require('crypto');
const Incident = require('../models/Incident');
const axios    = require('axios');
const { haversineDistance } = require('../utils/geo');

const AI_URL = 'http://localhost:5001/api/ai';

// Helper — call AI service safely. If AI is down, return defaults.
async function getAIAnalysis(description, fire_type, lat, lng, user, hasMedia, gpsScore, mediaPath, mediaIsLive, isAnonymous) {
  try {
    const reportedAt = new Date().toISOString();

    // 1. Fetch duplicate check and severity classification concurrently first
    const [duplicateRes, severityRes] = await Promise.all([
      axios.post(`${AI_URL}/check-duplicate`, {
        new_report: { lat, lng, reported_at: reportedAt }
      }),
      axios.post(`${AI_URL}/classify-severity`, { description, fire_type })
    ]);

    // 2. Build the trust payload using fields from the severity and duplicate results
    const trustPayload = {
      has_media:                          hasMedia,
      media_is_live:                      mediaIsLive === 'true' || mediaIsLive === true,
      reporter_reputation_score:          user.reputationScore || 50,
      gps_accuracy_meters:                50,
      gps_validation_score:               gpsScore || 50,
      description_length:                 description.length,
      description_credibility_adjustment: severityRes.data.credibility_adjustment || 0,
      description_is_vague:               severityRes.data.is_vague || false,
      description_is_genuine_emergency:   severityRes.data.is_genuine_emergency || false,
      description_emergency_confidence:   severityRes.data.emergency_confidence || 0,
      reporter_previous_false_reports:    user.falseReportCount || 0,
      is_duplicate:                       duplicateRes.data.is_duplicate,
      image_analysis:                     null // Placeholder or add mediaPath/analysis if available downstream
    };

    // 3. Request the trust score using the enriched payload
    const trustRes = await axios.post(`${AI_URL}/score-report`, trustPayload);

    let trustScore = trustRes.data.trust_score;
    let flags = trustRes.data.flags;

    // Apply penalty for anonymous reports after getting the score back
    if (isAnonymous === true || isAnonymous === 'true') {
      trustScore = Math.max(0, (trustScore || 50) - 15);
      flags = [...(flags || []), 'anonymous_report'];
    }

    return {
      is_duplicate:   duplicateRes.data.is_duplicate,
      duplicate_of:   duplicateRes.data.matching_incidents.map(m => m.incident_id),
      severity:       severityRes.data.predicted_severity,
      ai_trust_score: trustScore,
      ai_risk_level:  trustRes.data.risk_level,
      ai_flags:       flags
    };

  } catch (err) {
    // AI service is unavailable — use safe defaults
    console.warn('AI service unavailable, using defaults:', err.message);
    return {
      is_duplicate:   false,
      duplicate_of:   [],
      severity:       'Medium',
      ai_trust_score: 50,
      ai_risk_level:  'MEDIUM_RISK',
      ai_flags:       []
    };
  }
}

// POST /api/incidents
const reportIncident = async (req, res) => {
  const {
    description, fire_type, lat, lng,
    address, gps_validated, gps_score, media_is_live,
    isAnonymous, forceDuplicate,
  } = req.body;

  if (!description || !lat || !lng) {
    return res.status(400).json({ message: 'Description and location are required' });
  }

  try {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // ── Duplicate detection ───────────────────────────────────────
    // Check for any active (non-rejected, non-resolved) incident within 500m
    // reported in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const nearby = await Incident.find({
      status:     { $nin: ['rejected', 'resolved'] },
      reportedAt: { $gte: thirtyMinutesAgo },
      'location.lat': {
        $gte: parsedLat - 0.005, // ~500m latitude
        $lte: parsedLat + 0.005,
      },
      'location.lng': {
        $gte: parsedLng - 0.005, // ~500m longitude
        $lte: parsedLng + 0.005,
      },
    });

    const duplicate = nearby.find(i => {
      const dist = haversineDistance(
        parsedLat, parsedLng,
        i.location.lat, i.location.lng
      );
      return dist <= 500; // within 500 meters
    });

    if (duplicate && forceDuplicate !== 'true' && forceDuplicate !== true) {
      return res.status(409).json({
        message:        'A fire incident has already been reported at this location.',
        isDuplicate:    true,
        existingId:     duplicate._id,
        existingStatus: duplicate.status,
        reportedAt:     duplicate.reportedAt,
        distance:       Math.round(haversineDistance(
          parsedLat, parsedLng,
          duplicate.location.lat, duplicate.location.lng
        )),
      });
    }
    // ── End duplicate detection ───────────────────────────────────

    const mediaFiles = req.files ? req.files.map(f => f.path) : [];
    const hasMedia   = mediaFiles.length > 0;
    const firstMedia = hasMedia ? mediaFiles[0] : null;
    const gpsScore   = gps_score ? parseInt(gps_score, 10) : 50;

    // Get AI analysis with live capture flags and anonymity status passed along
    const ai = await getAIAnalysis(
      description,
      fire_type || 'other',
      parsedLat,
      parsedLng,
      req.user,
      hasMedia,
      gpsScore,
      firstMedia,
      media_is_live,
      isAnonymous
    );

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const fpHash = crypto.createHash('sha256')
      .update(`${ip}:${userAgent}`)
      .digest('hex')
      .substring(0, 16);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deviceTotal = await Incident.countDocuments({
      'deviceFingerprint.hash': fpHash,
      reportedAt: { $gte: oneDayAgo },
    });
    if (deviceTotal >= 10) {
      return res.status(429).json({
        message: 'Too many reports submitted from this device today.',
        rateLimited: true,
      });
    }

    const deviceRejected = await Incident.countDocuments({
      'deviceFingerprint.hash': fpHash,
      reportedAt: { $gte: oneDayAgo },
      status: 'rejected',
    });
    const devicePenalty = deviceRejected >= 3 ? 30 : deviceRejected >= 1 ? 15 : 0;

    let trustScore = ai.ai_trust_score;
    let aiFlags = ai.ai_flags;
    if (devicePenalty > 0) {
      trustScore = Math.max(0, (trustScore || 50) - devicePenalty);
      aiFlags = [...(aiFlags || []), `device_penalty_${devicePenalty}pts`];
    }

    const incident = await Incident.create({
      reportedBy:    req.user._id,
      description:   description.trim(),
      fire_type:     fire_type || 'other',
      location: {
        lat:     parsedLat,
        lng:     parsedLng,
        address: address || ''
      },
      mediaFiles,
      isAnonymous:    isAnonymous === true || isAnonymous === 'true',
      severity:       ai.severity,
      ai_trust_score: trustScore,
      ai_risk_level:  ai.ai_risk_level,
      ai_flags:       aiFlags,
      is_duplicate:   ai.is_duplicate,
      duplicate_of:   ai.duplicate_of,
      deviceFingerprint: { ip, userAgent, hash: fpHash },
    });

    res.status(201).json({
      message: 'Incident reported successfully',
      incident,
      ai_analysis: {
        severity:     ai.severity,
        trust_score:  ai.ai_trust_score,
        is_duplicate: ai.is_duplicate
      }
    });

  } catch (error) {
    console.error('Report incident error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/incidents/mine
const getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user._id })
      .sort({ reportedAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/incidents/all
const getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('reportedBy', 'name email reputationScore')
      .sort({ reportedAt: -1 });

    // Mask reporter identity for anonymous reports shown to non-admins
    const result = incidents.map(i => {
      if (i.isAnonymous && req.user.role !== 'admin') {
        const obj = i.toObject();
        obj.reportedBy = { name: 'Anonymous', email: '' };
        return obj;
      }
      return i;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, lat, lng, radius } = req.query;
    const query = {
      status: status ? status : { $in: ['verified','dispatched','resolved'] },
      isAnonymous: false, // never show anonymous in public feed
    };

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radMeters = parseFloat(radius) || 500;
      const radDeg = radMeters / 111000;

      query['location.lat'] = { $gte: latNum - radDeg, $lte: latNum + radDeg };
      query['location.lng'] = { $gte: lngNum - radDeg, $lte: lngNum + radDeg };
      if (!status) {
        query.status = { $nin: ['rejected', 'resolved'] };
      }
      delete query.isAnonymous;
    }

    const incidents = await Incident.find(query)
      .select('fire_type severity status location reportedAt description')
      .sort({ reportedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Strip exact GPS — only show approximate area
    const safe = incidents.map(i => ({
      _id:       i._id,
      fire_type: i.fire_type,
      severity:  i.severity,
      status:    i.status,
      address:   i.location?.address || 'Addis Ababa',
      reportedAt:i.reportedAt,
      // Round coordinates to ~500m precision for privacy
      lat: i.location?.lat ? Math.round(i.location.lat * 200) / 200 : null,
      lng: i.location?.lng ? Math.round(i.location.lng * 200) / 200 : null,
    }));

    const total = await Incident.countDocuments(query);

    res.json({ incidents: safe, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exportMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user._id })
      .sort({ reportedAt: -1 });

    const { stringify } = require('csv-stringify/sync');
    const rows = incidents.map(i => ({
      id:           i._id.toString(),
      fire_type:    i.fire_type,
      severity:     i.severity,
      status:       i.status,
      description:  i.description,
      address:      i.location?.address || '',
      lat:          i.location?.lat || '',
      lng:          i.location?.lng || '',
      ai_trust_score: i.ai_trust_score || '',
      is_anonymous: i.isAnonymous ? 'Yes' : 'No',
      reported_at:  i.reportedAt?.toISOString() || '',
      resolved_at:  i.resolvedAt?.toISOString() || '',
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=my-reports-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reportGuestIncident = async (req, res) => {
  try {
    const {
      description, fire_type, severity,
      location, guestEmail, guestPhone, forceDuplicate,
    } = req.body;

    if (!description || !fire_type || !location) {
      return res.status(400).json({ message: 'Description, fire type, and location are required.' });
    }

    if (!guestEmail || !/\S+@\S+\.\S+/.test(guestEmail)) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }

    if (!guestPhone || !/^[\d\s\+\-\(\)]{7,15}$/.test(guestPhone)) {
      return res.status(400).json({ message: 'A valid phone number is required.' });
    }

    const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

    // ── Duplicate detection ───────────────────────────────────────
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const nearby = await Incident.find({
      status:     { $nin: ['rejected', 'resolved'] },
      reportedAt: { $gte: thirtyMinutesAgo },
      'location.lat': { $gte: parsedLocation.lat - 0.005, $lte: parsedLocation.lat + 0.005 },
      'location.lng': { $gte: parsedLocation.lng - 0.005, $lte: parsedLocation.lng + 0.005 },
    });

    const duplicate = nearby.find(i =>
      haversineDistance(parsedLocation.lat, parsedLocation.lng, i.location.lat, i.location.lng) <= 500
    );

    if (duplicate && forceDuplicate !== 'true' && forceDuplicate !== true) {
      return res.status(409).json({
        message:        'A fire incident has already been reported at this location.',
        isDuplicate:    true,
        existingId:     duplicate._id,
        existingStatus: duplicate.status,
        reportedAt:     duplicate.reportedAt,
        distance:       Math.round(haversineDistance(parsedLocation.lat, parsedLocation.lng, duplicate.location.lat, duplicate.location.lng)),
      });
    }

    const incident = await Incident.create({
      reportedBy:  null,
      isGuest:     true,
      guestEmail:  guestEmail.toLowerCase().trim(),
      guestPhone:  guestPhone.trim(),
      description: description.trim(),
      fire_type,
      severity:    severity || 'Medium',
      location:    parsedLocation,
      isAnonymous: false,
      ai_trust_score: 40, // guests start lower — no reputation to verify against
    });

    // Try AI analysis but don't block if it fails
    try {
      const aiRes = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:5001'}/api/ai/score-report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          location: parsedLocation,
          is_anonymous: false,
          reputation_score: 50,
          false_report_count: 0,
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        incident.ai_trust_score = aiData.trust_score || 40;
        incident.ai_flags       = aiData.flags || [];
        await incident.save();
      }
    } catch { /* AI service down — proceed without score */ }

    res.status(201).json({
      message:    'Report submitted. Responders have been notified.',
      incidentId: incident._id,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name email reputationScore')
      .populate('assignedResponder', 'name email')
      .populate('statusHistory.updatedBy', 'name role')
      .populate('infoRequests.requestedBy', 'name role')
      .populate('infoRequests.assignedTo', 'name role');

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Mask identity if anonymous and requester is not the reporter or an admin/responder
    if (
      incident.isAnonymous &&
      req.user.role !== 'admin' &&
      req.user.role !== 'responder' &&
      (!incident.reportedBy || incident.reportedBy._id.toString() !== req.user._id.toString())
    ) {
      const obj = incident.toObject();
      obj.reportedBy = { name: 'Anonymous', email: '' };
      return res.json(obj);
    }

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { reportIncident, getMyIncidents, getAllIncidents, getPublicFeed, exportMyIncidents, reportGuestIncident, getIncidentById, getAIAnalysis };