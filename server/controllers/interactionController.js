const Interaction = require('../models/Interaction');
const User = require('../models/User');
const Note = require('../models/Note');

const askQuestion = async (req, res) => {
  try {
    const { teacherId, questionText, noteId } = req.body;
    if (!teacherId || !questionText) {
      return res.status(400).json({ message: 'Teacher ID and question text are required' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'Teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const interaction = await Interaction.create({
      student: req.user._id,
      teacher: teacherId,
      question: questionText,
      note: noteId || null,
      status: 'Pending',
      upvotes: []
    });

    const populated = await Interaction.findById(interaction._id)
      .populate('student', 'username')
      .populate('teacher', 'username')
      .populate('note', 'title');

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getQuestionsForUser = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Student') {
      query.student = req.user._id;
    } else if (req.user.role === 'Teacher') {
      query.teacher = req.user._id;
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const interactions = await Interaction.find(query)
      .populate('student', 'username')
      .populate('teacher', 'username')
      .populate('note', 'title')
      .sort({ createdAt: -1 });

    res.json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const answerQuestion = async (req, res) => {
  try {
    const { answerText } = req.body;
    if (!answerText) {
      return res.status(400).json({ message: 'Answer text is required' });
    }

    const interaction = await Interaction.findById(req.params.id);
    if (!interaction) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Only the assigned teacher can answer
    if (interaction.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to answer this question' });
    }

    interaction.answer = answerText;
    interaction.answeredAt = new Date();
    interaction.status = 'Answered';
    await interaction.save();

    const populated = await Interaction.findById(interaction._id)
      .populate('student', 'username')
      .populate('teacher', 'username')
      .populate('note', 'title');

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const resolveQuestion = async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.id);
    if (!interaction) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Only the student who asked can resolve
    if (interaction.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the student who asked can mark it resolved' });
    }

    interaction.status = 'Resolved';
    await interaction.save();

    const populated = await Interaction.findById(interaction._id)
      .populate('student', 'username')
      .populate('teacher', 'username')
      .populate('note', 'title');

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const upvoteQuestion = async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.id);
    if (!interaction) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const userIdx = interaction.upvotes.indexOf(req.user._id);
    if (userIdx > -1) {
      // Toggle off
      interaction.upvotes.splice(userIdx, 1);
    } else {
      // Toggle on
      interaction.upvotes.push(req.user._id);
    }

    await interaction.save();

    const populated = await Interaction.findById(interaction._id)
      .populate('student', 'username')
      .populate('teacher', 'username')
      .populate('note', 'title');

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  askQuestion, 
  getQuestionsForUser, 
  answerQuestion,
  resolveQuestion,
  upvoteQuestion
};
