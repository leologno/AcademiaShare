const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead, markChatAsRead } = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.put('/mark-all-read', protect, markAllAsRead);
router.put('/mark-chat-read/:senderId', protect, markChatAsRead);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
