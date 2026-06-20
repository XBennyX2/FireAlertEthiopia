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
} = require('../controllers/profileController');

router.get('/',                    protect, getProfile);
router.put('/',                    protect, updateProfile);
router.post('/email/request',      protect, requestEmailChange);
router.post('/email/verify',       protect, verifyEmailChange);
router.put('/password',            protect, changePassword);
router.post('/photo',              protect, uploadProfilePhoto);
router.delete('/photo',            protect, removeProfilePhoto);
router.delete('/',                 protect, deleteAccount);

module.exports = router;