const Incident = require('../models/Incident');
const axios    = require('axios');

const AI_URL = 'http://localhost:5001/api/ai';

// Helper — call AI service safely. If AI is down, return defaults.
async function getAIAnalysis(description, fire_type, lat, lng, user, hasMedia) {
  try {
    const reportedAt = new Date().toISOString();

    const [duplicateRes, severityRes, trustRes] = await Promise.all([
      axios.post(`${AI_URL}/check-duplicate`, {
        new_report: { lat, lng, reported_at: reportedAt }
      }),
      axios.post(`${AI_URL}/classify-severity`, { description, fire_type }),
      axios.post(`${AI_URL}/score-report`, {
        has_media:                        hasMedia,
        media_is_live:                    false,
        reporter_reputation_score:        user.reputationScore || 50,
        gps_accuracy_meters:              50,
        description_length:               description.length,
        reporter_previous_false_reports:  user.falseReportCount || 0,
        is_duplicate:                     false
      })
    ]);

    return {
      is_duplicate:      duplicateRes.data.is_duplicate,
      duplicate_of:      duplicateRes.data.matching_incidents.map(m => m.incident_id),
      severity:          severityRes.data.predicted_severity,
      ai_trust_score:    trustRes.data.trust_score,
      ai_risk_level:     trustRes.data.risk_level,
      ai_flags:          trustRes.data.flags
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
  const { description, fire_type, lat, lng, address } = req.body;

  if (!description || !lat || !lng) {
    return res.status(400).json({ message: 'Description and location are required' });
  }

  try {
    const mediaFiles = req.files ? req.files.map(f => f.path) : [];
    const hasMedia   = mediaFiles.length > 0;

    // Get AI analysis
    const ai = await getAIAnalysis(
      description,
      fire_type || 'other',
      parseFloat(lat),
      parseFloat(lng),
      req.user,
      hasMedia
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
      severity:      ai.severity,
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
    const incidents = await Incident.find({})
      .populate('reportedBy', 'name email')
      .sort({ reportedAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { reportIncident, getMyIncidents, getAllIncidents };