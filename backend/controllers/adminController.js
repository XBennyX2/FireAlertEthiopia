const User        = require('../models/User');
const Incident    = require('../models/Incident');
const AuditLog    = require('../models/AuditLog');
const Application = require('../models/Application');
const { parse }     = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const bcrypt         = require('bcryptjs');
const multer          = require('multer');

const csvUpload = multer({ storage: multer.memoryStorage() }).single('file');
// ── Helper: write an audit log entry ─────────────────────────────
async function log(adminId, action, details) {
  try {
    await AuditLog.create({ performedBy: adminId, action, details });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// GET /api/admin/users — get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/applications/mine — check current user's application status
const getMyApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ applicant: req.user._id })
      .sort({ createdAt: -1 }); // most recent
    res.json(application); // null if none exists
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/users/:id/role — change a user's role
const changeUserRole = async (req, res) => {
  const { role } = req.body;
  const validRoles = ['user', 'responder', 'admin'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const oldRole  = user.role;
    user.role      = role;
    await user.save();

    await log(req.user._id, 'ROLE_CHANGE', `Changed ${user.email} from ${oldRole} to ${role}`);

    res.json({ message: `Role updated to ${role}`, user });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/users/:id/status — activate or deactivate a user
const toggleUserStatus = async (req, res) => {
  const { isActive } = req.body;

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    user.isActive = isActive;
    await user.save();

    await log(req.user._id, 'STATUS_CHANGE', `${isActive ? 'Activated' : 'Deactivated'} user ${user.email}`);

    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}`, user });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/applications — get all pending responder applications
const getApplications = async (req, res) => {
  try {
    const applications = await Application.find({ status: 'pending' })
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/applications — submit a responder application (any logged-in user)
// POST /api/admin/applications — user submits a responder application
const submitApplication = async (req, res) => {
  try {
    const {
      phone,
      yearsExperience,
      previousTraining,
      currentOccupation,
      preferredStation,
      availability,
      motivation,
    } = req.body;

    // Required field validation
    if (!phone || yearsExperience === undefined || !preferredStation || !availability || !motivation) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    if (!['full_time', 'part_time', 'on_call', 'weekends_only'].includes(availability)) {
      return res.status(400).json({ message: 'Invalid availability option.' });
    }

    // Block duplicate pending applications
    const existing = await Application.findOne({ applicant: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending application. Please wait for a decision before applying again.' });
    }

    // Block re-applying if already a responder
    if (req.user.role === 'responder') {
      return res.status(400).json({ message: 'You are already a responder.' });
    }

    const application = await Application.create({
      applicant:          req.user._id,
      name:                req.user.name,
      email:               req.user.email,
      phone,
      yearsExperience,
      previousTraining:   previousTraining || '',
      currentOccupation:  currentOccupation || '',
      preferredStation,
      availability,
      motivation,
    });

    res.status(201).json({ message: 'Application submitted successfully. An admin will review it shortly.', application });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/applications/:id/approve
const approveApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = 'approved';
    await application.save();

    // Promote the user to responder
    await User.findByIdAndUpdate(application.applicant, { role: 'responder' });

    await log(req.user._id, 'APPLICATION_APPROVED', `Approved responder application for ${application.email}`);

    res.json({ message: 'Application approved. User promoted to responder.' });
    application.reviewedBy = req.user._id;
application.reviewedAt = new Date();  

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/applications/:id/reject
// PUT /api/admin/applications/:id/reject
const rejectApplication = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status !== 'pending') return res.status(400).json({ message: 'Application has already been reviewed' });

    application.status          = 'rejected';
    application.reviewedBy      = req.user._id;
    application.reviewedAt      = new Date();
    application.rejectionReason = rejectionReason || '';
    await application.save();

    await log(req.user._id, 'APPLICATION_REJECTED', `Rejected responder application from ${application.email}`);

    res.json({ message: 'Application rejected', application });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET /api/admin/logs — get audit logs
// GET /api/admin/audit-logs — with filtering
const getAuditLogs = async (req, res) => {
  try {
    const { user, action, startDate, endDate, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (user)   query.performedBy = user;
    if (action) query.action = action;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    if (search) {
      query.$or = [
        { action:  { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs  = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/audit-logs/export — export filtered logs as CSV
const exportAuditLogsCSV = async (req, res) => {
  try {
    const { user, action, startDate, endDate, search } = req.query;
    const query = {};

    if (user)   query.performedBy = user;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }
    if (search) {
      query.$or = [
        { action:  { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 });

    const rows = logs.map(l => ({
      timestamp:   l.createdAt.toISOString(),
      action:      l.action,
      performedBy: l.performedBy?.email || 'System',
      details:     l.details,
    }));

    const { stringify } = require('csv-stringify/sync');
    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/analytics — get system analytics
// GET /api/admin/analytics — with date range filtering
const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate)   query.reportedAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const incidents = await Incident.find(query);

    const total      = incidents.length;
    const byStatus   = {};
    const byFireType = {};
    const byMonth    = {};
    let resolvedCount = 0;
    let rejectedCount = 0;
    let totalResponseTimeMs = 0;
    let responseTimeCount   = 0;

    incidents.forEach(i => {
      byStatus[i.status]     = (byStatus[i.status]     || 0) + 1;
      byFireType[i.fire_type] = (byFireType[i.fire_type] || 0) + 1;

      const month = new Date(i.reportedAt).toLocaleString('en-US', { month:'short', year:'numeric' });
      byMonth[month] = (byMonth[month] || 0) + 1;

      if (i.status === 'resolved') resolvedCount++;
      if (i.status === 'rejected') rejectedCount++;

      if (i.status === 'resolved' && i.resolvedAt) {
        totalResponseTimeMs += new Date(i.resolvedAt) - new Date(i.reportedAt);
        responseTimeCount++;
      }
    });

    const avgResponseTimeMinutes = responseTimeCount > 0
      ? Math.round((totalResponseTimeMs / responseTimeCount) / 60000)
      : 0;

    const falseReportRate  = total > 0 ? ((rejectedCount / total) * 100).toFixed(1) : 0;
    const verificationRate = total > 0 ? (((total - rejectedCount) / total) * 100).toFixed(1) : 0;

    // Peak incident hours
    const byHour = Array(24).fill(0);
    incidents.forEach(i => {
      const hour = new Date(i.reportedAt).getHours();
      byHour[hour]++;
    });

    res.json({
      total,
      byStatus,
      byFireType,
      byMonth,
      byHour,
      avgResponseTimeMinutes,
      falseReportRate,
      verificationRate,
      resolvedCount,
      rejectedCount,
      dateRange: { startDate: startDate || null, endDate: endDate || null },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/analytics/export/csv
const exportAnalyticsCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate)   query.reportedAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const incidents = await Incident.find(query).populate('reportedBy', 'name email');

    const rows = incidents.map(i => ({
      id:              i._id.toString(),
      fire_type:       i.fire_type,
      severity:        i.severity,
      status:          i.status,
      reportedBy:      i.reportedBy?.email || 'Unknown',
      ai_trust_score:  i.ai_trust_score,
      reportedAt:      i.reportedAt?.toISOString(),
      resolvedAt:      i.resolvedAt?.toISOString() || '',
      address:         i.location?.address || '',
    }));

    const { stringify } = require('csv-stringify/sync');
    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/analytics/export/pdf
const exportAnalyticsPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate)   query.reportedAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const incidents = await Incident.find(query);
    const total = incidents.length;
    const byStatus = {};
    const byFireType = {};
    let resolvedCount = 0, rejectedCount = 0;

    incidents.forEach(i => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      byFireType[i.fire_type] = (byFireType[i.fire_type] || 0) + 1;
      if (i.status === 'resolved') resolvedCount++;
      if (i.status === 'rejected') rejectedCount++;
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=firealert-analytics-${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor('#e63c2f').text('FireAlert Analytics Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString('en-US')}`);
    if (startDate || endDate) {
      doc.text(`Date Range: ${startDate || 'All time'} to ${endDate || 'Present'}`);
    }
    doc.moveDown(1.5);

    // Summary section
    doc.fontSize(14).fillColor('#000').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Total Incidents Reported: ${total}`);
    doc.text(`Resolved: ${resolvedCount}`);
    doc.text(`Rejected (False Reports): ${rejectedCount}`);
    doc.text(`Verification Rate: ${total > 0 ? (((total - rejectedCount) / total) * 100).toFixed(1) : 0}%`);
    doc.moveDown(1.5);

    // By Status
    doc.fontSize(14).fillColor('#000').text('Incidents by Status', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    Object.entries(byStatus).forEach(([status, count]) => {
      doc.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`);
    });
    doc.moveDown(1.5);

    // By Fire Type
    doc.fontSize(14).fillColor('#000').text('Incidents by Fire Type', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    Object.entries(byFireType).forEach(([type, count]) => {
      doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`);
    });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('FireAlert — Fire Incident Reporting and Safety Awareness System, Addis Ababa', { align:'center' });

    doc.end();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const { applyReputationConsequences } = require('../utils/reputationManager');

// PUT /api/admin/users/:id/reputation — manually adjust reputation
const adjustReputation = async (req, res) => {
  const { newScore, reason } = req.body;

  if (newScore === undefined || newScore < 0 || newScore > 100) {
    return res.status(400).json({ message: 'Score must be between 0 and 100' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const result = await applyReputationConsequences(user._id, newScore);

    await log(
      req.user._id,
      'MANUAL_REPUTATION_ADJUSTMENT',
      `Admin adjusted ${user.email} reputation from ${user.reputationScore} to ${newScore}. Reason: ${reason || 'No reason provided'}`
    );

    res.json({
      message: `Reputation score updated to ${newScore}`,
      user: await User.findById(req.params.id).select('-password'),
      statusChanged: result,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/users/:id/unban — manually unban a user
const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Reset to warning level minimum so they can log in
    const rehabilitatedScore = 65;
    await applyReputationConsequences(user._id, rehabilitatedScore);

    await log(
      req.user._id,
      'MANUAL_UNBAN',
      `Admin manually unbanned ${user.email}. Score reset to ${rehabilitatedScore}`
    );

    res.json({
      message: `User ${user.email} has been unbanned. Reputation score reset to ${rehabilitatedScore}.`,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exportUsersCSV = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    const rows = users.map(u => ({
      name:             u.name,
      email:            u.email,
      phone:            u.phone || '',
      role:             u.role,
      reputationScore:  u.reputationScore,
      isActive:         u.isActive,
      isBanned:         u.isBanned,
      isRestricted:     u.isRestricted,
      falseReportCount: u.falseReportCount,
      createdAt:        u.createdAt?.toISOString() || '',
    }));

    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=firealert-users-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/users/import — bulk import users from CSV
const importUsersCSV = (req, res) => {
  csvUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No CSV file provided' });

    try {
      const records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const results = { created: 0, skipped: 0, errors: [] };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // account for header row

        if (!row.name || !row.email || !row.password) {
          results.errors.push(`Row ${rowNum}: Missing required field (name, email, or password)`);
          results.skipped++;
          continue;
        }

        const existing = await User.findOne({ email: row.email.toLowerCase().trim() });
        if (existing) {
          results.errors.push(`Row ${rowNum}: Email ${row.email} already exists — skipped`);
          results.skipped++;
          continue;
        }

        if (row.password.length < 6) {
          results.errors.push(`Row ${rowNum}: Password too short for ${row.email} — skipped`);
          results.skipped++;
          continue;
        }

        const validRoles = ['user', 'responder', 'admin'];
        const role = validRoles.includes(row.role) ? row.role : 'user';

        const salt     = await bcrypt.genSalt(10);
        const hashed   = await bcrypt.hash(row.password, salt);

        await User.create({
          name:     row.name.trim(),
          email:    row.email.toLowerCase().trim(),
          password: hashed,
          phone:    row.phone || '',
          role,
        });

        results.created++;
      }

      await log(req.user._id, 'BULK_USER_IMPORT', `Imported ${results.created} users, ${results.skipped} skipped`);

      res.json({
        message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
        ...results,
      });

    } catch (error) {
      res.status(400).json({ message: 'Failed to parse CSV file: ' + error.message });
    }
  });
};

module.exports = {
  getAllUsers,
  changeUserRole,
  toggleUserStatus,
  getApplications,
  submitApplication,
  approveApplication,
  rejectApplication,
  getAuditLogs,
  adjustReputation,
  unbanUser,
  getAnalytics,
  exportAuditLogsCSV, // <-- Make sure these are here!
  exportAnalyticsCSV,
  exportAnalyticsPDF,
  exportUsersCSV,
  importUsersCSV,
  getMyApplication,
};