const express    = require('express');
const dotenv     = require('dotenv');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:  'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible in every controller via req.app.get('io')
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/responder', require('./routes/responderRoutes'));
app.use('/api/admin',     require('./routes/adminRoutes'));

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins their private room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Responder joins an incident room to broadcast their location
  socket.on('joinIncidentRoom', (incidentId) => {
    socket.join(`incident_${incidentId}`);
    console.log(`Responder joined incident room: incident_${incidentId}`);
  });

  // Responder broadcasts their live location
  // Everyone in the incident room receives it
  socket.on('responderLocation', (data) => {
    // data = { incidentId, lat, lng, responderId, responderName }
    socket.to(`incident_${data.incidentId}`).emit('responderLocationUpdate', {
      lat:           data.lat,
      lng:           data.lng,
      responderId:   data.responderId,
      responderName: data.responderName,
      timestamp:     new Date().toISOString()
    });
  });

  // Responder leaves the incident room when resolved
  socket.on('leaveIncidentRoom', (incidentId) => {
    socket.leave(`incident_${incidentId}`);
    console.log(`Responder left incident room: incident_${incidentId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));