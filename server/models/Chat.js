const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    trim: true,
    default: '',
  },
  attachmentUrl: {
    type: String,
    default: '',
  },
  attachmentType: {
    type: String,
    default: '',
  },
  attachmentName: {
    type: String,
    default: '',
  },
  cloudinaryId: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    emoji: String
  }]
});

module.exports = mongoose.model('Chat', ChatSchema);
