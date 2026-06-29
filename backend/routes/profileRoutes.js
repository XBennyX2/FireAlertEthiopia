const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  uploadProfilePhoto,
  removeProfilePhoto,
  deleteAccount,
  getSessions,
  revokeSession,
  revokeOtherSessions,
  exportUserData,
} = require('../controllers/profileController');

router.get('/',                    protect, getProfile);
router.put('/',                    protect, updateProfile);
router.post('/email/request',      protect, requestEmailChange);
router.post('/email/verify',       protect, verifyEmailChange);
router.put('/password',            protect, changePassword);
router.post('/photo',              protect, uploadProfilePhoto);
router.delete('/photo',            protect, removeProfilePhoto);
router.delete('/',                 protect, deleteAccount);

// Session routes
router.get('/sessions',            protect, getSessions);
router.delete('/sessions',         protect, revokeOtherSessions);
router.delete('/sessions/:id',     protect, revokeSession);

// GDPR Export route
router.get('/export',              protect, exportUserData);
router.put('/notification-prefs', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notificationPrefs = { ...user.notificationPrefs, ...req.body };
    await user.save();
    res.json({ message: 'Preferences saved.', notificationPrefs: user.notificationPrefs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;