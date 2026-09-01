require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const Chat = require('./models/Chat');
const Notification = require('./models/Notification');

// Import routes
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const folderRoutes = require('./routes/folders');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const interactionRoutes = require('./routes/interaction');
const adminRoutes = require('./routes/admin');
const classroomRoutes = require('./routes/classrooms');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: '*', // For development flexibility
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/interaction', interactionRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classrooms', classroomRoutes);

let lastDbError = null;

// Root landing route
app.get('/', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    message: 'AcademiaShare API Server is running live.',
    status: 'online',
    database: isConnected ? 'connected' : 'disconnected',
    mongoUriProvided: Boolean(process.env.MONGO_URI),
    isCloudDatabase: Boolean(MONGO_URI && MONGO_URI.startsWith('mongodb+srv://')),
    ...(lastDbError && !isConnected ? { dbError: lastDbError } : {}),
    timestamp: new Date().toISOString(),
  });
});

// Simple status route
app.get('/api/status', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({ 
    status: 'running', 
    database: isConnected ? 'connected' : 'disconnected',
    mongoUriProvided: Boolean(process.env.MONGO_URI),
    ...(lastDbError && !isConnected ? { dbError: lastDbError } : {})
  });
});

const activeMeetings = {};

// Socket.IO event mapping
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Join a private channel using user's database ID (for receiving direct notifications/chats)
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined private room: ${userId}`);
    }
  });

  socket.on('classroom:join', (classroomId) => {
    if (classroomId) {
      socket.join(classroomId);
      console.log(`Socket ${socket.id} joined classroom room: ${classroomId}`);
    }
  });

  // Sending a chat message
  socket.on('chat:send', async (data) => {
    const { sender, recipient, message, attachmentUrl, attachmentType, attachmentName, cloudinaryId } = data;
    try {
      if (!sender || !recipient || (!message && !attachmentUrl)) return;

      // Save message to DB
      const newChat = await Chat.create({
        sender,
        recipient,
        message: message || '',
        attachmentUrl: attachmentUrl || '',
        attachmentType: attachmentType || '',
        attachmentName: attachmentName || '',
        cloudinaryId: cloudinaryId || null,
      });
      const populatedChat = await Chat.findById(newChat._id)
        .populate('sender', 'username')
        .populate('recipient', 'username');

      // Send chat message to both sender and recipient rooms
      io.to(sender).emit('chat:receive', populatedChat);
      io.to(recipient).emit('chat:receive', populatedChat);

      // Create a notification for recipient
      const senderUser = await mongoose.model('User').findById(sender);
      
      let notificationMsg = `New message from ${senderUser ? senderUser.username : 'someone'}`;
      if (message) {
        notificationMsg += `: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`;
      } else if (attachmentUrl) {
        const isImage = attachmentType && attachmentType.startsWith('image/');
        notificationMsg += ` attached a ${isImage ? 'photo' : 'document'}`;
      }

      const notification = await Notification.create({
        recipient,
        sender,
        type: 'chat',
        message: notificationMsg,
      });

      // Send live notification to recipient
      io.to(recipient).emit('notification:receive', notification);
    } catch (err) {
      console.error('Socket chat error:', err);
    }
  });

  // Alert/Notification trigger (useful for other real-time alerts like QA updates)
  socket.on('qa:question', async (data) => {
    const { studentId, teacherId, questionText } = data;
    try {
      const student = await mongoose.model('User').findById(studentId);
      const notification = await Notification.create({
        recipient: teacherId,
        sender: studentId,
        type: 'teacher_question',
        message: `${student ? student.username : 'A student'} asked you a question: "${questionText.substring(0, 30)}..."`,
      });
      io.to(teacherId).emit('notification:receive', notification);
    } catch (err) {
      console.error('Socket Q&A notification error:', err);
    }
  });

  socket.on('qa:answer', async (data) => {
    const { studentId, teacherId, answerText } = data;
    try {
      const teacher = await mongoose.model('User').findById(teacherId);
      const notification = await Notification.create({
        recipient: studentId,
        sender: teacherId,
        type: 'teacher_answer',
        message: `Teacher ${teacher ? teacher.username : ''} answered your question: "${answerText.substring(0, 30)}..."`,
      });
      io.to(studentId).emit('notification:receive', notification);
    } catch (err) {
      console.error('Socket Q&A answer error:', err);
    }
  });

  socket.on('chat:delete', (data) => {
    const { messageId, recipientId, senderId } = data;
    io.to(recipientId).emit('chat:deleted', { messageId });
    io.to(senderId).emit('chat:deleted', { messageId });
  });

  socket.on('chat:react', (data) => {
    const { messageId, recipientId, senderId, reactions } = data;
    io.to(recipientId).emit('chat:reacted', { messageId, reactions });
    io.to(senderId).emit('chat:reacted', { messageId, reactions });
  });

  socket.on('classroom:draw', (data) => {
    socket.to(data.classroomId).emit('classroom:draw', data);
  });

  socket.on('classroom:clear', (data) => {
    socket.to(data.classroomId).emit('classroom:clear');
  });

  socket.on('classroom:meeting-start', (data) => {
    socket.to(data.classroomId).emit('classroom:meeting-started', data);
  });

  socket.on('classroom:meeting-end', (data) => {
    socket.to(data.classroomId).emit('classroom:meeting-ended', data);
    // Cleanup meeting participants on end
    if (activeMeetings[data.classroomId]) {
      delete activeMeetings[data.classroomId];
    }
  });

  // --- Real-time Zoom/Meet Features ---
  socket.joinedMeetings = [];

  socket.on('classroom:join-meeting', (data) => {
    const { classroomId, user } = data;
    if (!classroomId || !user) return;

    socket.join(`meet:${classroomId}`);
    if (!socket.joinedMeetings.includes(classroomId)) {
      socket.joinedMeetings.push(classroomId);
    }

    if (!activeMeetings[classroomId]) {
      activeMeetings[classroomId] = {};
    }

    activeMeetings[classroomId][socket.id] = {
      socketId: socket.id,
      userId: user._id,
      username: user.username,
      role: user.role,
      isMuted: false,
      isCamOff: false,
      isHandRaised: false,
      isScreenSharing: false
    };

    console.log(`User ${user.username} joined meeting for classroom ${classroomId}`);
    io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
  });

  socket.on('classroom:leave-meeting', (data) => {
    const { classroomId } = data;
    if (!classroomId) return;

    socket.leave(`meet:${classroomId}`);
    socket.joinedMeetings = socket.joinedMeetings.filter(id => id !== classroomId);

    if (activeMeetings[classroomId] && activeMeetings[classroomId][socket.id]) {
      delete activeMeetings[classroomId][socket.id];
      io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
    }
  });

  socket.on('meeting:toggle-mute', (data) => {
    const { classroomId, isMuted } = data;
    if (activeMeetings[classroomId] && activeMeetings[classroomId][socket.id]) {
      activeMeetings[classroomId][socket.id].isMuted = isMuted;
      io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
    }
  });

  socket.on('meeting:toggle-cam', (data) => {
    const { classroomId, isCamOff } = data;
    if (activeMeetings[classroomId] && activeMeetings[classroomId][socket.id]) {
      activeMeetings[classroomId][socket.id].isCamOff = isCamOff;
      io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
    }
  });

  socket.on('meeting:toggle-screen-share', (data) => {
    const { classroomId, isScreenSharing } = data;
    if (activeMeetings[classroomId] && activeMeetings[classroomId][socket.id]) {
      activeMeetings[classroomId][socket.id].isScreenSharing = isScreenSharing;
      io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
    }
  });

  socket.on('meeting:raise-hand', (data) => {
    const { classroomId, isHandRaised } = data;
    if (activeMeetings[classroomId] && activeMeetings[classroomId][socket.id]) {
      activeMeetings[classroomId][socket.id].isHandRaised = isHandRaised;
      io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
    }
  });

  socket.on('meeting:send-message', (data) => {
    const { classroomId, message } = data;
    if (!classroomId || !message) return;
    io.to(`meet:${classroomId}`).emit('meeting:message', {
      sender: message.sender,
      text: message.text,
      time: new Date()
    });
  });

  socket.on('webrtc:signal', (data) => {
    const { to, signal } = data;
    if (to) {
      io.to(to).emit('webrtc:signal', {
        from: socket.id,
        signal
      });
    }
  });

  socket.on('meeting:mute-all', (data) => {
    const { classroomId } = data;
    if (classroomId) {
      socket.to(`meet:${classroomId}`).emit('meeting:muted-by-teacher');
      // Update in-memory status for all student sockets
      if (activeMeetings[classroomId]) {
        Object.keys(activeMeetings[classroomId]).forEach(sid => {
          if (sid !== socket.id) {
            activeMeetings[classroomId][sid].isMuted = true;
          }
        });
        io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
      }
    }
  });

  socket.on('meeting:lock-board', (data) => {
    const { classroomId, isLocked } = data;
    if (classroomId) {
      socket.to(`meet:${classroomId}`).emit('meeting:board-locked-status', { isLocked });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (socket.joinedMeetings) {
      socket.joinedMeetings.forEach(classroomId => {
        if (activeMeetings[classroomId] && activeMeetings[classroomId][socket.id]) {
          delete activeMeetings[classroomId][socket.id];
          io.to(`meet:${classroomId}`).emit('meeting:participants', Object.values(activeMeetings[classroomId]));
        }
      });
    }
  });
});

// Expose io for HTTP routes if needed
app.set('io', io);

const seedDatabase = async () => {
  try {
    const User = require('./models/User');
    const crypto = require('crypto');

    const adminExists = await User.findOne({ role: 'Admin' });
    if (!adminExists) {
      console.log('Seeding default accounts...');

      const hashSHA256 = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

      // Seed Admin
      await User.create({
        username: 'admin',
        email: 'admin@academia.edu',
        password: hashSHA256('admin123'),
        role: 'Admin',
        title: 'IT Staff',
        profession: 'Administrator',
        department: 'Information Technology',
        isApproved: true,
      });

      // Seed Teacher
      await User.create({
        username: 'teacher',
        email: 'teacher@academia.edu',
        password: hashSHA256('teacher123'),
        role: 'Teacher',
        title: 'Professor',
        profession: 'Academic',
        department: 'Computer Science',
        isApproved: true,
      });

      // Seed Student
      await User.create({
        username: 'student',
        email: 'student@academia.edu',
        password: hashSHA256('student123'),
        role: 'Student',
        title: 'Student',
        profession: 'Student',
        department: 'Computer Science',
        year: 'Freshman',
        isApproved: true,
      });

      console.log('Default accounts (Admin, Teacher, Student) seeded successfully!');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
};

// Database Connection
const PORT = process.env.PORT || 5000;
const rawMongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim().replace(/^["']|["']$/g, '') : '';
const MONGO_URI = rawMongoUri || 'mongodb://127.0.0.1:27017/studynotes';

console.log(`Attempting to connect to MongoDB: ${MONGO_URI.replace(/:([^:@]{1,})@/, ':****@')}`);

const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGO_URI, { 
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    lastDbError = null;
    console.log('MongoDB connection established successfully.');
    try {
      fs.writeFileSync(path.join(__dirname, '.mongo_uri.tmp'), MONGO_URI);
    } catch (e) {}
    await seedDatabase();
  } catch (err) {
    lastDbError = err.message;
    console.error('MongoDB connection failed with error:', err.message);
    
    // Only attempt memory server fallback for local development
    const isLocal = MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('localhost');
    if (isLocal) {
      console.log('Attempting to launch in-memory MongoDB server fallback for local execution...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create({
          binary: { version: '4.4.29' },
        });
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        lastDbError = null;
        console.log(`In-memory MongoDB database started successfully: ${mongoUri}`);
        try {
          fs.writeFileSync(path.join(__dirname, '.mongo_uri.tmp'), mongoUri);
        } catch (e) {}
        await seedDatabase();
        return;
      } catch (memErr) {
        console.error('Failed to launch in-memory MongoDB server:', memErr.message);
      }
    } else {
      // For cloud MongoDB (Atlas), attempt reconnection in background every 10 seconds
      setTimeout(connectWithRetry, 10000);
    }
  }
};

connectWithRetry().finally(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
