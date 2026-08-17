const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { 
  askQuestion, 
  getQuestionsForUser, 
  answerQuestion,
  resolveQuestion,
  upvoteQuestion
} = require('../controllers/interactionController');

router.post('/', protect, askQuestion);
router.get('/', protect, getQuestionsForUser);
router.put('/:id/answer', protect, authorize('Teacher'), answerQuestion);
router.put('/:id/resolve', protect, resolveQuestion);
router.post('/:id/upvote', protect, upvoteQuestion);

module.exports = router;
