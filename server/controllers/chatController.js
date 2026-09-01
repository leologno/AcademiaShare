const path = require('path');
const fs = require('fs');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../config/cloudinary');

const getChatHistory = async (req, res) => {
  try {
    const user1 = req.user._id;
    const user2 = req.params.userId;

    const messages = await Chat.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getChatPartners = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Find all chats involving the current user
    const chats = await Chat.find({
      $or: [{ sender: currentUserId }, { recipient: currentUserId }],
    });

    const partnerIds = new Set();
    chats.forEach(chat => {
      if (chat.sender.toString() !== currentUserId.toString()) {
        partnerIds.add(chat.sender.toString());
      }
      if (chat.recipient.toString() !== currentUserId.toString()) {
        partnerIds.add(chat.recipient.toString());
      }
    });

    // Populate partner details
    const partners = await User.find({ _id: { $in: Array.from(partnerIds) } })
      .select('username email role');

    res.json(partners);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteChatMessage = async (req, res) => {
  try {
    const message = await Chat.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    // Clean up attachment from Cloudinary or local disk
    if (message.cloudinaryId) {
      await deleteFromCloudinary(message.cloudinaryId);
    } else if (message.attachmentUrl && message.attachmentUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', message.attachmentUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    message.isDeleted = true;
    message.message = 'This message was deleted.';
    message.attachmentUrl = '';
    message.attachmentName = '';
    message.attachmentType = '';
    message.cloudinaryId = null;
    await message.save();

    res.json({ message: 'Message deleted successfully', chat: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reactToChatMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Chat.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingIdx = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIdx > -1) {
      // Remove reaction
      message.reactions.splice(existingIdx, 1);
    } else {
      // Add reaction
      message.reactions.push({
        user: req.user._id,
        username: req.user.username,
        emoji
      });
    }

    await message.save();
    
    const populated = await Chat.findById(message._id)
      .populate('sender', 'username')
      .populate('recipient', 'username');

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  getChatHistory, 
  getChatPartners,
  deleteChatMessage,
  reactToChatMessage
};
