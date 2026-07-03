const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const { requireActiveReputation } = require('../middleware/reputationMiddleware');
const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { reportGuestIncident } = require('../controllers/incidentController');

// Public — no auth required
router.post('/guest', reportGuestIncident);
const {
  reportIncident,
  getMyIncidents,
  getAllIncidents,
  exportMyIncidents, // <-- Add this
  getPublicFeed      // <-- Add this too!
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

const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Routes
// Public — no auth required
router.get('/mine/export', protect, exportMyIncidents);
router.get('/public', getPublicFeed);
router.get('/mine', protect, authorize('user'),                    getMyIncidents);
router.get('/all',  protect, authorize('admin', 'responder'),      getAllIncidents);

router.post('/',
  protect,
  authorize('user'),
  requireActiveReputation,
  upload.array('media', 5),
  validate([
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters.'),
    body('fire_type').isIn(['residential','commercial','vehicle','industrial','wildland','other']).withMessage('Invalid fire type.'),
    body('lat').notEmpty().withMessage('Location latitude is required.').isFloat().withMessage('Latitude must be a valid number.'),
    body('lng').notEmpty().withMessage('Location longitude is required.').isFloat().withMessage('Longitude must be a valid number.'),
  ]),
  reportIncident
);

module.exports = router;