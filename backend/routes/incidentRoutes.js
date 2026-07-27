const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const { body }   = require('express-validator');
const validate   = require('../middleware/validate');

const { protect }                = require('../middleware/authMiddleware');
const { authorize }              = require('../middleware/roleMiddleware');
const { requireActiveReputation } = require('../middleware/reputationMiddleware');

const {
  reportIncident,
  reportGuestIncident,
  getMyIncidents,
  getAllIncidents,
  exportMyIncidents,
  getPublicFeed,
  getIncidentById,
  getAIAnalysis,
} = require('../controllers/incidentController');

// ── Multer config ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits:     { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    allowed.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only images and videos are allowed'));
  },
});

// ── Public routes (no auth) — MUST be before /:id ─────────────────
router.post('/guest',  reportGuestIncident);
router.get('/public',  getPublicFeed);

// ── Authenticated specific routes — MUST be before /:id ───────────
router.get('/mine/export', protect, exportMyIncidents);
router.get('/mine',        protect, authorize('user'), getMyIncidents);
router.get('/all',         protect, authorize('admin', 'responder'), getAllIncidents);
router.get('/ai/:id',      protect, getAIAnalysis);

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

// ── Wildcard /:id — MUST be last ──────────────────────────────────
router.get('/:id', protect, getIncidentById);

module.exports = router;