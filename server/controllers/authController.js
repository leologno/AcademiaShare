const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      profilePicture: user.profilePicture,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error(error);
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
