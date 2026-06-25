const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const sessionExists = await Session.findOne({ token, userId: decoded.id });
      if (!sessionExists) {
        return res.status(401).json({ message: 'Session has been revoked or expired' });
      }

      sessionExists.lastActive = new Date();
      await sessionExists.save();

      req.user = await User.findById(decoded.id).select('-password');
      req.token = token;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };