const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const {
  uploadNote,
  getApprovedNotes,
  getNoteById,
  rateNote,
  commentNote,
  bookmarkNote,
  deleteNote,
} = require('../controllers/noteController');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config (Memory storage for direct streaming to Cloudinary or local fallback)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and Images (JPG, PNG) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes
router.post('/upload', protect, upload.single('noteFile'), uploadNote);
router.post('/', protect, upload.single('noteFile'), uploadNote);
router.get('/', protect, getApprovedNotes);
router.get('/:id', protect, getNoteById);
router.post('/:id/rate', protect, rateNote);
router.post('/:id/comment', protect, commentNote);
router.post('/:id/bookmark', protect, bookmarkNote);
router.delete('/:id', protect, deleteNote);

module.exports = router;
