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

const {
  isCloudinaryConfigured,
  uploadToCloudinary,
} = require('../config/cloudinary');

// Ensure uploads folder exists for local fallback
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration (memory storage for direct stream)
const storage = multer.memoryStorage();

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
router.post('/upload', protect, upload.single('chatFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileUrl = '';
    let cloudinaryId = null;

    if (isCloudinaryConfigured()) {
      const safeName = path.parse(req.file.originalname || 'attachment').name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'studynotes/chat',
        public_id: `chat-${Date.now()}-${safeName}`,
        resource_type: 'auto',
      });
      fileUrl = uploadResult.url;
      cloudinaryId = uploadResult.publicId;
    } else {
      const filename = `chat-${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/${filename}`;
    }

    res.json({
      fileUrl,
      cloudinaryId,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error('Error during chat upload:', err);
    res.status(500).json({ message: 'Server error during chat upload' });
  }
});

router.delete('/messages/:id', protect, deleteChatMessage);
router.post('/messages/:id/react', protect, reactToChatMessage);

module.exports = router;
