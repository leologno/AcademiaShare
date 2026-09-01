const Note = require('../models/Note');
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const fs = require('fs');
const path = require('path');

const getPendingNotes = async (req, res) => {
  try {
    const notes = await Note.find({ approved: false })
      .populate('uploader', 'username email role')
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const approveNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.approved = true;
    await note.save();

    res.json({ message: 'Note approved successfully', note });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Remove file locally
    const filePath = path.join(__dirname, '..', note.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Note.findByIdAndDelete(note._id);
    res.json({ message: 'Note rejected and deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: true }).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: false }).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isApproved = true;
    await user.save();

    res.json({ message: 'User account approved successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admins can change user roles.' });
    }

    const { role } = req.body;
    if (!role || !['Student', 'Teacher', 'Admin', 'SubAdmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.role = role;
    await user.save();

    res.json({ message: `User role updated to ${role} successfully.`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    // Only super Admins can delete active users or pending user requests (reject)
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admins can delete/ban user accounts.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'Admin') {
      return res.status(400).json({ message: 'Cannot delete/ban an Admin account' });
    }

    // Clean up user's avatar if stored
    const { deleteFromCloudinary } = require('../config/cloudinary');
    if (user.cloudinaryId) {
      await deleteFromCloudinary(user.cloudinaryId, 'image');
    } else if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
      const avatarPath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(avatarPath)) {
        try { fs.unlinkSync(avatarPath); } catch (e) {}
      }
    }

    // Find and delete notes uploaded by user
    const notes = await Note.find({ uploader: user._id });
    for (let note of notes) {
      if (note.cloudinaryId) {
        await deleteFromCloudinary(note.cloudinaryId);
      }
      if (note.fileUrl && note.fileUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', note.fileUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      }
    }
    await Note.deleteMany({ uploader: user._id });

    // Clean up classroom memberships
    await Classroom.updateMany(
      { students: user._id },
      { $pull: { students: user._id } }
    );
    await Classroom.updateMany(
      { 'classRepresentatives.student': user._id },
      { $pull: { classRepresentatives: { student: user._id } } }
    );

    // Clean up interactions and notifications
    const Interaction = require('../models/Interaction');
    const Notification = require('../models/Notification');
    await Interaction.deleteMany({
      $or: [{ student: user._id }, { teacher: user._id }]
    });
    await Notification.deleteMany({
      $or: [{ recipient: user._id }, { sender: user._id }]
    });

    await User.findByIdAndDelete(user._id);
    res.json({ message: 'User and all their uploaded notes deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({})
      .populate('teacher', 'username email role')
      .populate('students', 'username email role')
      .sort({ name: 1 });
    res.json(classrooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getPendingNotes,
  approveNote,
  rejectNote,
  getAllUsers,
  getPendingUsers,
  approveUser,
  updateUserRole,
  deleteUser,
  getAllClassrooms,
};
