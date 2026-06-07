const User        = require('../models/User');
const Incident    = require('../models/Incident');
const AuditLog    = require('../models/AuditLog');
const Application = require('../models/Application');

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
const submitApplication = async (req, res) => {
  const { reason } = req.body;
  try {
    // Check if user already has a pending application
    const existing = await Application.findOne({
      applicant: req.user._id,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ message: 'You already have a pending application' });
    }

    const application = await Application.create({
      applicant: req.user._id,
      name:      req.user.name,
      email:     req.user.email,
      reason:    reason || ''
    });

    res.status(201).json({ message: 'Application submitted', application });

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

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/applications/:id/reject
const rejectApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = 'rejected';
    await application.save();

    await log(req.user._id, 'APPLICATION_REJECTED', `Rejected responder application for ${application.email}`);

    res.json({ message: 'Application rejected.' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/logs — get audit logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/analytics — get system analytics
const getAnalytics = async (req, res) => {
  try {
    const totalIncidents = await Incident.countDocuments();
    const totalUsers     = await User.countDocuments();

    // Count by status
    const statusGroups = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byStatus = {};
    statusGroups.forEach(g => { byStatus[g._id] = g.count; });

    // Count by month
    const monthGroups = await Incident.aggregate([
      {
        $group: {
          _id: {
            year:  { $year:  '$reportedAt' },
            month: { $month: '$reportedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const byMonth = {};
    monthGroups.forEach(g => {
      const key = `${g._id.year}-${String(g._id.month).padStart(2, '0')}`;
      byMonth[key] = g.count;
    });

    // Average resolution time in minutes
    const resolved = await Incident.find({
      status: 'resolved',
      resolvedAt: { $exists: true }
    });
    let avgResponseMinutes = 0;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((sum, inc) => {
        return sum + (new Date(inc.resolvedAt) - new Date(inc.reportedAt));
      }, 0);
      avgResponseMinutes = Math.round(totalMs / resolved.length / 60000);
    }

    res.json({
      totalIncidents,
      totalUsers,
      byStatus,
      byMonth,
      avgResponseMinutes
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
  getAnalytics
};