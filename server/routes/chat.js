const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const { 
  getChatHistory, 
  getChatPartners,
  deleteChatMessage,
  reactToChatMessage
} = require('../controllers/chatController');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `chat-${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.txt', '.pptx', '.ppt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type for chat attachment! Only documents and images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.get('/partners', protect, getChatPartners);
router.get('/:userId', protect, getChatHistory);

// Chat file upload
router.post('/upload', protect, upload.single('chatFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during chat upload' });
  }
});

router.delete('/messages/:id', protect, deleteChatMessage);
router.post('/messages/:id/react', protect, reactToChatMessage);

module.exports = router;
