const dotenv     = require('dotenv');
dotenv.config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const helmet     = require('helmet');
const hpp        = require('hpp');

const connectDB  = require('./config/db');
const passport   = require('./config/passport');
const { recordError, recordRequest, getSystemHealth } = require('./controllers/healthController');
const {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  reportLimiter,
} = require('./config/rateLimiters');
const { detectSuspiciousLogin } = require('./middleware/suspiciousActivity');
const { protect }   = require('./middleware/authMiddleware');
const { authorize } = require('./middleware/roleMiddleware');
const { publishScheduledContent, sendWeeklySafetyDigest, sendAdminWeeklyReport } = require('./utils/scheduler');


connectDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:  ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

// ── Security headers ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allows media files to load
  crossOriginEmbedderPolicy: false, // required for Leaflet maps
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'"],
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:         ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'],
      connectSrc:     ["'self'", 'ws://localhost:5000', 'http://localhost:5000'],
      mediaSrc:       ["'self'", 'blob:'],
      objectSrc:      ["'none'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods:              ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders:       ['Content-Type', 'Authorization'],
  credentials:          true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ── Passport (Google OAuth) ───────────────────────────────────────
app.use(passport.initialize());

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request counter (for health monitoring) ───────────────────────
app.use((req, res, next) => {
  recordRequest();
  next();
});

// ── NoSQL injection prevention (custom in-place sanitizer) ────────
app.use((req, res, next) => {
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  if (req.body)   sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  if (req.query)  sanitizeObject(req.query); // sanitized in place — req.query is read-only in newer Express
  next();
});

// ── HTTP parameter pollution prevention ──────────────────────────
app.use(hpp());

// ── Static files ──────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Global rate limiter ───────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Auth routes with stricter limits ─────────────────────────────
app.use('/api/auth/login',           detectSuspiciousLogin, authLimiter);
app.use('/api/auth/register',        authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password',  passwordResetLimiter);
app.use('/api/incidents', (req, res, next) => {
  if (req.method === 'POST') return reportLimiter(req, res, next);
  next();
});


// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/responder', require('./routes/responderRoutes'));
app.use('/api/admin',     require('./routes/adminRoutes'));
app.use('/api/profile',   require('./routes/profileRoutes'));
app.use('/api/safety',    require('./routes/safetyRoutes'));
app.use('/api/forum',     require('./routes/forumRoutes'));
app.use('/api/messages',  require('./routes/messageRoutes'));

app.get('/api/admin/health', protect, authorize('admin'), getSystemHealth);

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  recordError();
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ── 404 handler — must be last ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Socket.io ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('joinIncidentRoom', (incidentId) => {
    socket.join(`incident_${incidentId}`);
  });

  socket.on('responderLocation', (data) => {
    socket.to(`incident_${data.incidentId}`).emit('responderLocationUpdate', {
      lat:           data.lat,
      lng:           data.lng,
      responderId:   data.responderId,
      responderName: data.responderName,
      timestamp:     new Date().toISOString(),
    });
  });

  socket.on('leaveIncidentRoom', (incidentId) => {
    socket.leave(`incident_${incidentId}`);
  });

  // Messaging — typing indicators
  socket.on('typing', ({ to, fromName }) => {
    io.to(to).emit('typing', { fromName });
  });

  socket.on('stopTyping', ({ to }) => {
    io.to(to).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ── Scheduled background jobs ──────────────────────────────────────

// Auto-publish scheduled safety content — every 5 minutes
setInterval(publishScheduledContent, 5 * 60 * 1000);
publishScheduledContent(); // run once on startup

// Weekly safety digest — every Sunday at 09:00
const now      = new Date();
const nextSun  = new Date();
nextSun.setDate(nextSun.getDate() + ((7 - now.getDay()) % 7 || 7));
nextSun.setHours(9, 0, 0, 0);
setTimeout(() => {
  sendWeeklySafetyDigest();
  setInterval(sendWeeklySafetyDigest, 7 * 24 * 60 * 60 * 1000);
}, nextSun - now);

// Weekly admin report — every Monday at 08:00
const nextMon = new Date();
nextMon.setDate(nextMon.getDate() + ((1 + 7 - nextMon.getDay()) % 7 || 7));
nextMon.setHours(8, 0, 0, 0);
setTimeout(() => {
  sendAdminWeeklyReport();
  setInterval(sendAdminWeeklyReport, 7 * 24 * 60 * 60 * 1000);
}, nextMon - new Date());

// ── Start server ────────────────────────────────────────────────────

const allowed = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost',
  'capacitor://localhost',
  'http://192.168.1.6:3000',
];

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));