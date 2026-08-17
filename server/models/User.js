const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Student', 'Teacher', 'Admin', 'SubAdmin'],
    default: 'Student',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  profilePicture: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    default: '',
  },
  profession: {
    type: String,
    default: '',
  },
  title: {
    type: String, // e.g. Professor, Lecturer, Admin Moderator (mainly for Teachers/Admins)
    default: '',
  },
  year: {
    type: String, // e.g. Freshman, Sophomore, Junior, Senior (mainly for Students)
    default: '',
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
  }],
  focusSessions: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', UserSchema);
