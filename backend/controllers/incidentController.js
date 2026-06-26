const Incident = require('../models/Incident');
const axios    = require('axios');

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
    isAnonymous,
  } = req.body;

  if (!description || !lat || !lng) {
    return res.status(400).json({ message: 'Description and location are required' });
  }

  try {
    const mediaFiles = req.files ? req.files.map(f => f.path) : [];
    const hasMedia   = mediaFiles.length > 0;
    const firstMedia = hasMedia ? mediaFiles[0] : null;
    const gpsScore   = gps_score ? parseInt(gps_score, 10) : 50;

    // Get AI analysis with live capture flags and anonymity status passed along
    const ai = await getAIAnalysis(
      description,
      fire_type || 'other',
      parseFloat(lat),
      parseFloat(lng),
      req.user,
      hasMedia,
      gpsScore,
      firstMedia,
      media_is_live,
      isAnonymous
    );

    const incident = await Incident.create({
      reportedBy:    req.user._id,
      description,
      fire_type:     fire_type || 'other',
      location: {
        lat:     parseFloat(lat),
        lng:     parseFloat(lng),
        address: address || ''
      },
      mediaFiles,
      isAnonymous:    isAnonymous === true || isAnonymous === 'true',
      severity:       ai.severity,
      ai_trust_score: ai.ai_trust_score,
      ai_risk_level:  ai.ai_risk_level,
      ai_flags:       ai.ai_flags,
      is_duplicate:   ai.is_duplicate,
      duplicate_of:   ai.duplicate_of
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

module.exports = { reportIncident, getMyIncidents, getAllIncidents };