const Classroom = require('../models/Classroom');
const Note = require('../models/Note');
const mongoose = require('mongoose');

// Helper to generate a random 6-character mixed-case alphanumeric code
const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get classrooms for the logged-in user (as teacher or student) or ALL if Admin/SubAdmin
exports.getClassrooms = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin' && req.user.role !== 'SubAdmin') {
      query = {
        $or: [
          { teacher: req.user.id },
          { students: req.user.id }
        ]
      };
    }

    const classrooms = await Classroom.find(query)
      .populate('teacher', 'username email')
      .sort({ createdAt: -1 });

    res.json(classrooms);
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    res.status(500).json({ message: 'Server error fetching classrooms' });
  }
};

// Create classroom (Teacher only)
exports.createClassroom = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Valid classroom name is required' });
    }

    if (req.user.role !== 'Teacher' && req.user.role !== 'Admin' && req.user.role !== 'SubAdmin') {
      return res.status(403).json({ message: 'Only Teachers or Administrators can create classrooms' });
    }

    let classroomCode = generateRandomCode();

    // Verify code uniqueness
    let existingClassroom = await Classroom.findOne({ code: classroomCode });
    while (existingClassroom) {
      classroomCode = generateRandomCode();
      existingClassroom = await Classroom.findOne({ code: classroomCode });
    }

    const newClassroom = await Classroom.create({
      name,
      code: classroomCode,
      teacher: req.user.id,
      students: [],
      announcements: [],
      sharedNotes: [],
      classRepresentatives: []
    });

    const populated = await Classroom.findById(newClassroom._id).populate('teacher', 'username email');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating classroom:', err);
    res.status(500).json({ message: 'Server error creating classroom' });
  }
};

// Join classroom using simple case-sensitive code word (Student/Teacher/Admin)
exports.joinClassroom = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Valid classroom code word is required' });
    }

    const classroomCode = code.trim(); // Case sensitive
    const classroom = await Classroom.findOne({ code: classroomCode });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found. Please verify the code word.' });
    }

    // Check if user is the teacher
    if (classroom.teacher.toString() === req.user.id) {
      return res.status(400).json({ message: 'You are the teacher of this classroom.' });
    }

    // Check if user is already a student in the classroom
    if (classroom.students.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have already joined this classroom.' });
    }

    classroom.students.push(req.user.id);
    await classroom.save();

    const populated = await Classroom.findById(classroom._id).populate('teacher', 'username email');
    res.json({ message: 'Successfully joined classroom', classroom: populated });
  } catch (err) {
    console.error('Error joining classroom:', err);
    res.status(500).json({ message: 'Server error joining classroom' });
  }
};

// Get classroom details by ID
exports.getClassroomById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }
    const classroom = await Classroom.findById(req.params.id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('classRepresentatives.student', 'username email')
      .populate({
        path: 'sharedNotes',
        populate: { path: 'uploader', select: 'username' }
      });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verify membership: user must be teacher or student
    const isTeacher = classroom.teacher._id.toString() === req.user.id;
    const isStudent = classroom.students.some(s => s._id.toString() === req.user.id);
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this classroom.' });
    }

    res.json(classroom);
  } catch (err) {
    console.error('Error fetching classroom details:', err);
    res.status(500).json({ message: 'Server error fetching classroom details' });
  }
};

// Add announcement to classroom
exports.addAnnouncement = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Valid announcement text is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verify membership & permissions: only teacher, or CR with canPostAnnouncements power, or Admin can post
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    const cr = classroom.classRepresentatives.find(r => r.student.toString() === req.user.id);
    const hasPower = isTeacher || isAdmin || (cr && cr.powers.canPostAnnouncements);

    if (!hasPower) {
      return res.status(403).json({ message: 'Only class teachers or authorized representatives can post announcements.' });
    }

    // Create announcement item
    const announcement = {
      text,
      sender: req.user.username,
      createdAt: new Date(),
      comments: []
    };

    classroom.announcements.unshift(announcement); // New announcements at top
    await classroom.save();

    res.json(classroom.announcements);
  } catch (err) {
    console.error('Error posting announcement:', err);
    res.status(500).json({ message: 'Server error posting announcement' });
  }
};

// Share note to classroom
exports.shareNote = async (req, res) => {
  try {
    const { noteId } = req.body;

    if (!noteId || !mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ message: 'Valid Note ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verify membership & permissions
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    const cr = classroom.classRepresentatives.find(r => r.student.toString() === req.user.id);
    const canShare = isTeacher || isAdmin || (cr && cr.powers.canShareNotes);

    if (!canShare) {
      return res.status(403).json({ message: 'Only class teachers or authorized representatives can share notes' });
    }

    // Verify note exists
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Study note not found' });
    }

    // Check if note already shared
    if (classroom.sharedNotes.includes(noteId)) {
      return res.status(400).json({ message: 'This note is already shared with this classroom' });
    }

    classroom.sharedNotes.push(noteId);
    note.classroom = classroom._id;
    await note.save();
    await classroom.save();

    const populatedNotes = await Classroom.findById(classroom._id)
      .populate({
        path: 'sharedNotes',
        populate: { path: 'uploader', select: 'username' }
      });

    res.json(populatedNotes.sharedNotes);
  } catch (err) {
    console.error('Error sharing note:', err);
    res.status(500).json({ message: 'Server error sharing note' });
  }
};

// Set Class Representative
exports.setRepresentative = async (req, res) => {
  try {
    const { studentId, powers } = req.body;
    
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }
    
    if (!powers || typeof powers !== 'object') {
      return res.status(400).json({ message: 'Powers configuration is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Only teacher or admin can manage CRs
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'Only the classroom teacher or administrators can designate class representatives.' });
    }

    // Student must be in the class
    if (!classroom.students.includes(studentId)) {
      return res.status(400).json({ message: 'User is not enrolled in this classroom.' });
    }

    // Check if already CR
    const existingIdx = classroom.classRepresentatives.findIndex(
      r => r.student.toString() === studentId
    );

    if (existingIdx > -1) {
      // Update powers
      classroom.classRepresentatives[existingIdx].powers = {
        canPostAnnouncements: !!powers.canPostAnnouncements,
        canShareNotes: !!powers.canShareNotes,
        canDeleteComments: !!powers.canDeleteComments
      };
    } else {
      // Limit to max 2 CRs
      if (classroom.classRepresentatives.length >= 2) {
        return res.status(400).json({ message: 'You can only designate up to 2 class representatives.' });
      }
      classroom.classRepresentatives.push({
        student: studentId,
        powers: {
          canPostAnnouncements: !!powers.canPostAnnouncements,
          canShareNotes: !!powers.canShareNotes,
          canDeleteComments: !!powers.canDeleteComments
        }
      });
    }

    await classroom.save();
    const populated = await Classroom.findById(classroom._id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('classRepresentatives.student', 'username email')
      .populate({
        path: 'sharedNotes',
        populate: { path: 'uploader', select: 'username' }
      });
    res.json(populated);
  } catch (err) {
    console.error('Error setting representative:', err);
    res.status(500).json({ message: 'Server error setting representative' });
  }
};

// Remove Class Representative
exports.removeRepresentative = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Only teacher or admin can manage CRs
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'Only the classroom teacher or administrators can manage representatives.' });
    }

    classroom.classRepresentatives = classroom.classRepresentatives.filter(
      r => r.student.toString() !== studentId
    );

    await classroom.save();
    const populated = await Classroom.findById(classroom._id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('classRepresentatives.student', 'username email')
      .populate({
        path: 'sharedNotes',
        populate: { path: 'uploader', select: 'username' }
      });
    res.json(populated);
  } catch (err) {
    console.error('Error removing representative:', err);
    res.status(500).json({ message: 'Server error removing representative' });
  }
};

// Add comment to announcement
exports.addAnnouncementComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { id, announcementId } = req.params;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Valid comment text is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verify membership
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isStudent = classroom.students.includes(req.user.id);
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this classroom.' });
    }

    const announcement = classroom.announcements.id(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.comments.push({
      text,
      sender: req.user.username,
      user: req.user.id,
      createdAt: new Date()
    });

    await classroom.save();
    res.json(classroom.announcements);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ message: 'Server error adding comment' });
  }
};

// Delete comment on announcement
exports.deleteAnnouncementComment = async (req, res) => {
  try {
    const { id, announcementId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(announcementId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verify permissions: only teacher, or CR with canDeleteComments, or Admin can delete comments
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    const cr = classroom.classRepresentatives.find(r => r.student.toString() === req.user.id);
    const canDelete = isTeacher || isAdmin || (cr && cr.powers.canDeleteComments);

    if (!canDelete) {
      return res.status(403).json({ message: 'You do not have permission to delete comments in this classroom.' });
    }

    const announcement = classroom.announcements.id(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.comments = announcement.comments.filter(
      c => c._id.toString() !== commentId
    );

    await classroom.save();
    res.json(classroom.announcements);
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ message: 'Server error deleting comment' });
  }
};

// Start classroom video meeting
exports.startMeeting = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Authorization check: Only teacher or Admin can start a meeting
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'Only instructors can host class meetings.' });
    }

    // Generate meeting code
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'meet-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    classroom.meeting = {
      isActive: true,
      code,
      startedAt: new Date()
    };

    await classroom.save();
    res.json(classroom);
  } catch (err) {
    console.error('Error starting classroom meeting:', err);
    res.status(500).json({ message: 'Server error starting meeting' });
  }
};

// End classroom video meeting
exports.endMeeting = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID format' });
    }
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Authorization check: Only teacher or Admin can end a meeting
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SubAdmin';
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'Only instructors can end class meetings.' });
    }

    classroom.meeting = {
      isActive: false,
      code: '',
      startedAt: null
    };

    await classroom.save();
    res.json(classroom);
  } catch (err) {
    console.error('Error ending classroom meeting:', err);
    res.status(500).json({ message: 'Server error ending meeting' });
  }
};
