const Message = require('../models/Message');
const User    = require('../models/User');

// GET /api/messages/responders — list all other active responders
const getResponders = async (req, res) => {
  try {
    const responders = await User.find({
      role:     'responder',
      isActive: true,
      _id:      { $ne: req.user._id },
    }).select('name profilePhoto isOnDuty reputationScore');

    res.json(responders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/messages/thread/:userId — get conversation with a specific user
const getThread = async (req, res) => {
  try {
    const other = req.params.userId;
    const me    = req.user._id;

    const messages = await Message.find({
      $or: [
        { from: me,    to: other },
        { from: other, to: me    },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('from', 'name profilePhoto');

    // Mark messages sent to me as read
    await Message.updateMany(
      { from: other, to: me, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/messages/conversations — list all conversations (latest message per thread)
const getConversations = async (req, res) => {
  try {
    const me = req.user._id;

    const messages = await Message.find({
      $or: [{ from: me }, { to: me }],
    })
      .sort({ createdAt: -1 })
      .populate('from', 'name profilePhoto')
      .populate('to',   'name profilePhoto');

    // Deduplicate — one entry per conversation partner
    const seen = new Set();
    const convos = [];

    for (const msg of messages) {
      const other = msg.from._id.toString() === me.toString() ? msg.to : msg.from;
      const key   = other._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        convos.push({
          partner:   other,
          lastMessage: {
            content:   msg.content,
            createdAt: msg.createdAt,
            fromMe:    msg.from._id.toString() === me.toString(),
          },
          unreadCount: 0, // filled below
        });
      }
    }

    // Get unread counts per partner
    const unreadCounts = await Message.aggregate([
      { $match: { to: me, read: false } },
      { $group: { _id: '$from', count: { $sum: 1 } } },
    ]);

    const unreadMap = {};
    unreadCounts.forEach(u => { unreadMap[u._id.toString()] = u.count; });

    convos.forEach(c => {
      c.unreadCount = unreadMap[c.partner._id.toString()] || 0;
    });

    res.json(convos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/messages — send a message
const sendMessage = async (req, res) => {
  try {
    const { to, content } = req.body;

    if (!to || !content?.trim()) {
      return res.status(400).json({ message: 'Recipient and content are required.' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 1000 characters).' });
    }

    const recipient = await User.findById(to);
    if (!recipient || !['responder', 'admin'].includes(recipient.role)) {
      return res.status(400).json({ message: 'Can only message responders and admins.' });
    }

    const message = await Message.create({
      from:    req.user._id,
      to,
      content: content.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate('from', 'name profilePhoto');

    // Real-time delivery via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(to.toString()).emit('newMessage', {
        message:    populated,
        fromName:   req.user.name,
        fromId:     req.user._id.toString(),
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/messages/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ to: req.user._id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getResponders, getThread, getConversations, sendMessage, getUnreadCount };