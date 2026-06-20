const express    = require('express');
const dotenv     = require('dotenv');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const helmet     = require('helmet');
const hpp        = require('hpp');
const connectDB  = require('./config/db');
const {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  reportLimiter,
} = require('./config/rateLimiters');
const { detectSuspiciousLogin } = require('./middleware/suspiciousActivity');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:  ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

// ── Security headers ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allows media files to load
  contentSecurityPolicy: false, // disabled for dev — enable in production
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
  methods:          ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders:   ['Content-Type', 'Authorization'],
  credentials:      true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── NoSQL injection prevention ────────────────────────────────────
// Custom sanitizer that doesn't break on read-only req.query in newer Express
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

  // req.query is read-only in newer Express — sanitize its contents in place instead of reassigning
  if (req.query) sanitizeObject(req.query);

  next();
});

// ── HTTP parameter pollution prevention ──────────────────────────
app.use(hpp());
app.use('/api/forum', require('./routes/forumRoutes'));
// ── Static files ──────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Global rate limiter ───────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Auth routes with stricter limits ─────────────────────────────
app.use('/api/auth/login',            detectSuspiciousLogin, authLimiter);
app.use('/api/auth/register',         authLimiter);
app.use('/api/auth/forgot-password',  passwordResetLimiter);
app.use('/api/auth/reset-password',   passwordResetLimiter);
app.use('/api/incidents',             reportLimiter);

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/responder', require('./routes/responderRoutes'));
app.use('/api/admin',     require('./routes/adminRoutes'));
app.use('/api/profile',   require('./routes/profileRoutes'));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ── 404 handler ───────────────────────────────────────────────────
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
      timestamp:     new Date().toISOString()
    });
  });

  socket.on('leaveIncidentRoom', (incidentId) => {
    socket.leave(`incident_${incidentId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));