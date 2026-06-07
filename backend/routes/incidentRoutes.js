const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  reportIncident,
  getMyIncidents,
  getAllIncidents
} = require('../controllers/incidentController');

// Multer config — saves uploaded files to the /uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const ext     = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Routes
router.post('/',    protect, authorize('user'),                    upload.array('media', 5), reportIncident);
router.get('/mine', protect, authorize('user'),                    getMyIncidents);
router.get('/all',  protect, authorize('admin', 'responder'),      getAllIncidents);

module.exports = router;