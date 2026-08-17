const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  announcements: [{
    text: { type: String, required: true },
    sender: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    comments: [{
      text: { type: String, required: true },
      sender: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  }],
  sharedNotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  classRepresentatives: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    powers: {
      canPostAnnouncements: { type: Boolean, default: false },
      canShareNotes: { type: Boolean, default: false },
      canDeleteComments: { type: Boolean, default: false }
    }
  }],
  meeting: {
    isActive: { type: Boolean, default: false },
    code: { type: String, default: '' },
    startedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);
