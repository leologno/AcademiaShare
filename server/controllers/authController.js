const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const {
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../config/cloudinary');

const hashSHA256 = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkeystudynotesplatform', {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const { username, email, password, role, designation, profession, department, secretCode } = req.body;

  try {
    if (!username || !email || !password || !designation || !profession || !department) {
      return res.status(400).json({ message: 'Please include all fields (Username, Email, Password, Designation, Profession, Department)' });
    }

    if (role === 'Admin' || role === 'SubAdmin') {
      if (secretCode !== '4587') {
        return res.status(400).json({ message: 'Invalid Admin Secret Code.' });
      }
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password using SHA256
    const hashedPassword = hashSHA256(password);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'Student',
      title: designation,
      profession,
      department,
      isApproved: false, // All account creations must be approved by admin
    });

    if (user) {
      res.status(201).json({
        pending: true,
        message: 'Registration successful! Your account is pending administrator approval. Please contact an admin to activate it.',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please include both email and password' });
    }

    const user = await User.findOne({ email });

    if (user && hashSHA256(password) === user.password) {
      if (!user.isApproved) {
        return res.status(403).json({
          message: 'Your account is pending administrator approval. Please contact an admin to activate your access.',
        });
      }

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department || 'Computer Science',
        title: user.title || '',
        profession: user.profession || '',
        year: user.year || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || '',
        bookmarks: user.bookmarks || [],
        focusSessions: user.focusSessions || 0,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('bookmarks');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'Teacher', isApproved: true }).select('_id username email');
    res.json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: true }).select('_id username email role');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.department = req.body.department !== undefined ? req.body.department : user.department;
      user.title = req.body.title !== undefined ? req.body.title : user.title;
      user.year = req.body.year !== undefined ? req.body.year : user.year;

      if (req.body.password) {
        user.password = hashSHA256(req.body.password);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
        bio: updatedUser.bio,
        department: updatedUser.department,
        title: updatedUser.title,
        year: updatedUser.year,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profilePicture = '';
    let cloudinaryId = null;

    if (isCloudinaryConfigured()) {
      // Remove old avatar from Cloudinary if exists
      if (user.cloudinaryId) {
        await deleteFromCloudinary(user.cloudinaryId, 'image');
      }
      const safeName = path.parse(req.file.originalname || 'avatar').name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'studynotes/avatars',
        public_id: `avatar-${Date.now()}-${safeName}`,
        resource_type: 'image',
      });
      profilePicture = uploadResult.url;
      cloudinaryId = uploadResult.publicId;
    } else {
      // Local disk fallback
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      // Remove old local file if present
      if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', user.profilePicture);
        if (fs.existsSync(oldFilePath)) {
          try { fs.unlinkSync(oldFilePath); } catch (e) {}
        }
      }
      const filename = `avatar-${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      profilePicture = `/uploads/${filename}`;
    }

    user.profilePicture = profilePicture;
    if (cloudinaryId) {
      user.cloudinaryId = cloudinaryId;
    }
    await user.save();

    res.json({
      profilePicture: user.profilePicture,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error during avatar upload' });
  }
};

const incrementFocusSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.focusSessions = (user.focusSessions || 0) + 1;
      await user.save();
      res.json({ focusSessions: user.focusSessions });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error incrementing focus sessions:', error);
    res.status(500).json({ message: 'Server error incrementing focus sessions' });
  }
};

module.exports = { 
  registerUser, 
  authUser, 
  getUserProfile, 
  getTeachers, 
  getUsers, 
  updateUserProfile, 
  uploadAvatar,
  incrementFocusSessions
};
