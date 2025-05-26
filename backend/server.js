const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messaging-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String, default: '' }
});

const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  conversationId: String,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  attachments: [{
    type: { type: String, enum: ['image', 'file'] },
    url: String,
    name: String
  }],
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  reactions: [{
    emoji: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  pinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Message = mongoose.model('Message', messageSchema);

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: String,
  lastMessageTime: { type: Date, default: Date.now },
  isGroup: { type: Boolean, default: false },
  groupName: String,
  groupAvatar: String,
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId });
    
    if (!user) {
      throw new Error();
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid login credentials');
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid login credentials');
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Profile Routes
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password if changing password
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update username and email if changed
    if (username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username already taken');
      }
      user.username = username;
    }

    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already taken');
      }
      user.email = email;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// File Upload Routes
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    req.user.avatar = avatarUrl;
    await req.user.save();

    res.json({ avatar: avatarUrl });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Protected Routes
app.get('/api/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    }).populate('participants', 'username avatar');
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/messages/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ 
      conversationId: req.params.conversationId 
    }).populate('sender', 'username avatar');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User Search Route
app.get('/api/users/search', auth, async (req, res) => {
  try {
    const searchQuery = req.query.q;
    console.log('Search query:', searchQuery);
    console.log('User making request:', req.user._id);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    }).select('username email avatar');

    console.log('Search results:', users);
    res.json(users);
  } catch (error) {
    console.error('Error in user search:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get All Users Route
app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id } // Exclude the current user
    }).select('username email avatar');
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create New Conversation
app.post('/api/conversations', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] }
    });

    if (existingConversation) {
      return res.json(existingConversation);
    }

    const conversation = new Conversation({
      participants: [req.user._id, participantId]
    });

    await conversation.save();
    
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar');
    
    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Group Conversation
app.post('/api/conversations/group', auth, async (req, res) => {
  try {
    const { name, participants } = req.body;
    
    if (!name || !participants || participants.length < 2) {
      throw new Error('Group name and at least 2 participants are required');
    }

    const conversation = new Conversation({
      participants: [req.user._id, ...participants],
      isGroup: true,
      groupName: name,
      groupAdmin: req.user._id
    });

    await conversation.save();
    
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar')
      .populate('groupAdmin', 'username');
    
    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Group Info
app.put('/api/conversations/:conversationId/group', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new Error('Not a group conversation');
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      throw new Error('Only group admin can update group info');
    }

    const { name, avatar } = req.body;
    
    if (name) conversation.groupName = name;
    if (avatar) conversation.groupAvatar = avatar;

    await conversation.save();
    
    const updatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar')
      .populate('groupAdmin', 'username');
    
    res.json(updatedConversation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add/Remove Group Participants
app.put('/api/conversations/:conversationId/participants', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new Error('Not a group conversation');
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      throw new Error('Only group admin can manage participants');
    }

    const { add, remove } = req.body;
    
    if (add) {
      conversation.participants = [...new Set([...conversation.participants, ...add])];
    }
    
    if (remove) {
      conversation.participants = conversation.participants.filter(
        p => !remove.includes(p.toString())
      );
    }

    await conversation.save();
    
    const updatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar')
      .populate('groupAdmin', 'username');
    
    res.json(updatedConversation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Message Edit Route
app.put('/api/messages/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      throw new Error('Not authorized to edit this message');
    }

    message.text = req.body.text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar');

    io.to(message.conversationId).emit('message updated', populatedMessage);
    res.json(populatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Message Delete Route
app.delete('/api/messages/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      throw new Error('Not authorized to delete this message');
    }

    await message.deleteOne();
    io.to(message.conversationId).emit('message deleted', message._id);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add Reaction Route
app.post('/api/messages/:messageId/reactions', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction if it already exists
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
      );
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        user: req.user._id
      });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('reactions.user', 'username');

    io.to(message.conversationId).emit('message updated', populatedMessage);
    res.json(populatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Message Forwarding Route
app.post('/api/messages/forward', auth, async (req, res) => {
  try {
    const { messageIds, conversationIds } = req.body;
    
    if (!messageIds || !conversationIds) {
      throw new Error('Message IDs and conversation IDs are required');
    }

    const messages = await Message.find({ _id: { $in: messageIds } })
      .populate('sender', 'username avatar');

    const forwardedMessages = [];

    for (const conversationId of conversationIds) {
      for (const message of messages) {
        const newMessage = new Message({
          conversationId,
          sender: req.user._id,
          text: `Forwarded: ${message.text}`,
          attachments: message.attachments,
          forwarded: true,
          originalMessage: message._id
        });

        await newMessage.save();
        forwardedMessages.push(newMessage);

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: `Forwarded: ${message.text}`,
          lastMessageTime: new Date()
        });
      }
    }

    const populatedMessages = await Message.find({ _id: { $in: forwardedMessages.map(m => m._id) } })
      .populate('sender', 'username avatar');

    // Emit socket events for each conversation
    for (const conversationId of conversationIds) {
      io.to(conversationId).emit('new message', populatedMessages);
    }

    res.json(populatedMessages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Message Search Route
app.get('/api/messages/search', auth, async (req, res) => {
  try {
    const { query, conversationId } = req.query;
    
    if (!query) {
      throw new Error('Search query is required');
    }

    const searchQuery = {
      $or: [
        { text: { $regex: query, $options: 'i' } },
        { 'attachments.name': { $regex: query, $options: 'i' } }
      ]
    };

    if (conversationId) {
      searchQuery.conversationId = conversationId;
    } else {
      // If no conversation specified, search in all user's conversations
      const userConversations = await Conversation.find({
        participants: req.user._id
      }).select('_id');
      searchQuery.conversationId = { $in: userConversations.map(c => c._id) };
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', 'username avatar')
      .populate('conversationId', 'isGroup groupName')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Pin/Unpin Message Route
app.put('/api/messages/:messageId/pin', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is part of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation.participants.includes(req.user._id)) {
      throw new Error('Not authorized to pin messages in this conversation');
    }

    message.pinned = !message.pinned;
    if (message.pinned) {
      message.pinnedAt = new Date();
      message.pinnedBy = req.user._id;
    } else {
      message.pinnedAt = null;
      message.pinnedBy = null;
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('pinnedBy', 'username');

    io.to(message.conversationId).emit('message updated', populatedMessage);
    res.json(populatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get Pinned Messages Route
app.get('/api/conversations/:conversationId/pinned', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.participants.includes(req.user._id)) {
      throw new Error('Not authorized to view this conversation');
    }

    const pinnedMessages = await Message.find({
      conversationId: req.params.conversationId,
      pinned: true
    })
    .populate('sender', 'username avatar')
    .populate('pinnedBy', 'username')
    .sort({ pinnedAt: -1 });

    res.json(pinnedMessages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('send message', async (data) => {
    try {
      const message = new Message({
        conversationId: data.conversationId,
        sender: data.senderId,
        text: data.text,
        attachments: data.attachments
      });
      await message.save();

      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: data.text || 'Sent an attachment',
        lastMessageTime: new Date()
      });

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username avatar');

      io.to(data.conversationId).emit('new message', populatedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 