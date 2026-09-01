const Note = require('../models/Note');
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const fs = require('fs');
const path = require('path');
const {
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../config/cloudinary');

const uploadNote = async (req, res) => {
  try {
    const { title, description, category, classroomId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let targetClassroomId = classroomId || null;
    let approved = req.user.role === 'Teacher' || req.user.role === 'Admin' || !!targetClassroomId;

    if (targetClassroomId) {
      const classroom = await Classroom.findById(targetClassroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      const isTeacher = classroom.teacher.toString() === req.user._id.toString();
      const isStudent = classroom.students.some(s => s.toString() === req.user._id.toString());
      const cr = classroom.classRepresentatives.find(r => r.student.toString() === req.user._id.toString());
      const isCR = !!cr;
      const canShare = isTeacher || (isCR && cr.powers.canShareNotes);

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: 'Access denied. You are not a member of this classroom.' });
      }
      if (!isTeacher && isStudent && !canShare) {
        return res.status(403).json({ message: 'You do not have permission to upload materials to this classroom.' });
      }
    }

    let fileUrl = '';
    let cloudinaryId = null;

    if (isCloudinaryConfigured()) {
      // Direct stream upload to Cloudinary CDN
      const safeName = path.parse(req.file.originalname || 'note').name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'studynotes/materials',
        public_id: `${Date.now()}-${safeName}`,
        resource_type: 'auto',
      });
      fileUrl = uploadResult.url;
      cloudinaryId = uploadResult.publicId;
    } else {
      // Local disk fallback
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/${filename}`;
    }

    const note = await Note.create({
      title,
      description,
      fileUrl,
      cloudinaryId,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      category: category || 'General',
      uploader: req.user._id,
      approved,
      classroom: targetClassroomId,
    });

    if (targetClassroomId) {
      const classroom = await Classroom.findById(targetClassroomId);
      classroom.sharedNotes.push(note._id);
      await classroom.save();
    }

    res.status(201).json(note);
  } catch (error) {
    console.error('Error during note upload:', error);
    res.status(500).json({ message: 'Server error during note upload' });
  }
};

const getApprovedNotes = async (req, res) => {
  try {
    const { search, category } = req.query;
    
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    let query = { 
      approved: true,
      classroom: null
    };

    if (!isAdmin) {
      const userDept = req.user.department || 'Computer Science';
      const usersInDept = await User.find({
        $or: [
          { department: userDept },
          { role: { $in: ['Admin', 'SubAdmin'] } }
        ]
      }).select('_id');
      const deptUserIds = usersInDept.map(u => u._id);
      query.uploader = { $in: deptUserIds };
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const notes = await Note.find(query)
      .populate('uploader', 'username role department')
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploader', 'username role department')
      .populate('comments.user', 'username role');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Enforce classroom privacy
    if (note.classroom) {
      const classroom = await Classroom.findById(note.classroom);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found for this study material' });
      }
      const isTeacher = classroom.teacher.toString() === req.user._id.toString();
      const isStudent = classroom.students.some(s => s.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
      
      if (!isTeacher && !isStudent && !isAdmin) {
        return res.status(403).json({ message: 'Access denied. You are not a member of the classroom holding this material.' });
      }
    } else {
      // Enforce department boundary for global notes
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
      const uploader = await User.findById(note.uploader);
      const userDept = req.user.department || 'Computer Science';
      const uploaderDept = uploader ? (uploader.department || 'Computer Science') : 'Computer Science';
      const isUploaderAdmin = uploader && (uploader.role === 'Admin' || uploader.role === 'SubAdmin');
      if (!isAdmin && !isUploaderAdmin && uploader && uploaderDept !== userDept) {
        return res.status(403).json({ message: 'Access denied. This material belongs to another department.' });
      }
    }

    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const rateNote = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if already rated
    const existingRating = note.ratings.find(r => r.user.toString() === req.user._id.toString());

    if (existingRating) {
      existingRating.rating = rating;
    } else {
      note.ratings.push({ user: req.user._id, rating });
    }

    await note.save();
    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const commentNote = async (req, res) => {
  try {
    const text = req.body.text || req.body.comment;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const comment = {
      user: req.user._id,
      username: req.user.username,
      text,
      createdAt: new Date(),
    };

    note.comments.push(comment);
    await note.save();

    // Populate comments user again to send updated note back
    const updatedNote = await Note.findById(note._id)
      .populate('uploader', 'username role')
      .populate('comments.user', 'username role');

    res.json(updatedNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const bookmarkNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const user = await User.findById(req.user._id);
    const index = user.bookmarks.findIndex(b => b.toString() === note._id.toString());

    if (index > -1) {
      // Remove bookmark
      user.bookmarks.splice(index, 1);
      note.bookmarksCount = Math.max(0, (note.bookmarksCount || 1) - 1);
    } else {
      // Add bookmark
      user.bookmarks.push(note._id);
      note.bookmarksCount = (note.bookmarksCount || 0) + 1;
    }

    await user.save();
    await note.save();

    res.json({ bookmarks: user.bookmarks, bookmarksCount: note.bookmarksCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Only owner, teacher, or admin can delete
    if (
      note.uploader.toString() !== req.user._id.toString() &&
      req.user.role !== 'Admin' &&
      req.user.role !== 'Teacher'
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    // Delete from Cloudinary if hosted there
    if (note.cloudinaryId) {
      await deleteFromCloudinary(note.cloudinaryId);
    }

    // Remove file locally if stored in /uploads/
    if (note.fileUrl && note.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', note.fileUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await Note.findByIdAndDelete(note._id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadNote,
  getApprovedNotes,
  getNoteById,
  rateNote,
  commentNote,
  bookmarkNote,
  deleteNote,
};
