const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    default: '',
    trim: true,
  },
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null,
  },
  answeredAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['Pending', 'Answered', 'Resolved'],
    default: 'Pending',
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Interaction', InteractionSchema);
