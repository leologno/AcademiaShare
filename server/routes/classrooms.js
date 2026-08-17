const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getClassrooms,
  createClassroom,
  joinClassroom,
  getClassroomById,
  addAnnouncement,
  shareNote,
  setRepresentative,
  removeRepresentative,
  addAnnouncementComment,
  deleteAnnouncementComment,
  startMeeting,
  endMeeting
} = require('../controllers/classroomController');

// All classroom endpoints require login session
router.get('/', protect, getClassrooms);
router.post('/', protect, createClassroom);
router.post('/join', protect, joinClassroom);
router.get('/:id', protect, getClassroomById);
router.post('/:id/announcement', protect, addAnnouncement);
router.post('/:id/share', protect, shareNote);

// Class Representatives Management
router.post('/:id/representatives', protect, setRepresentative);
router.delete('/:id/representatives/:studentId', protect, removeRepresentative);

// Announcement Comments
router.post('/:id/announcements/:announcementId/comments', protect, addAnnouncementComment);
router.delete('/:id/announcements/:announcementId/comments/:commentId', protect, deleteAnnouncementComment);

// Video Meeting & Whiteboard
router.post('/:id/meeting/start', protect, startMeeting);
router.post('/:id/meeting/end', protect, endMeeting);

module.exports = router;
