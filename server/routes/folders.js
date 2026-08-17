const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createFolder,
  getFolders,
  getFolderContents,
  addNoteToFolder,
  deleteFolder,
} = require('../controllers/folderController');

router.post('/', protect, createFolder);
router.get('/', protect, getFolders);
router.get('/:id', protect, getFolderContents);
router.post('/:id/notes', protect, addNoteToFolder);
router.delete('/:id', protect, deleteFolder);

module.exports = router;
