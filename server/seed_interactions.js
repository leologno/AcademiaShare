const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load models
const User = require('./models/User');
const Note = require('./models/Note');
const Classroom = require('./models/Classroom');
const Folder = require('./models/Folder');
const Interaction = require('./models/Interaction');
const Chat = require('./models/Chat');
const Notification = require('./models/Notification');

const hashSHA256 = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

async function runSeed() {
  try {
    const uriFile = path.join(__dirname, '.mongo_uri.tmp');
    if (!fs.existsSync(uriFile)) {
      throw new Error(`Active database URI file not found at ${uriFile}`);
    }
    const mongoUri = fs.readFileSync(uriFile, 'utf8').trim();
    console.log(`Connecting to database: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Database connection successful!');

    // Define 20 new distinct usernames
    const newNames = [
      'Tarek', 'Jamil', 'Nabil', 'Sufian', 'Faruk', 'Zishan',
      'Mim', 'Siam', 'Rafi', 'Shuvo', 'Pranto', 'Turjo',
      'Anika', 'Fariha', 'Sadia', 'Tasnia', 'Mumu', 'Nisha',
      'Sumaiya', 'Lamia'
    ];

    // Clear previous seeded test users to ensure clean run
    console.log('\n--- 1. Clearing previous test data ---');
    await User.deleteMany({ username: { $in: newNames } });
    console.log('Cleared previous run users.');

    const users = [];

    console.log('\n--- 2. Registering 20 Users (Pending Admin Approval) ---');
    for (let i = 0; i < newNames.length; i++) {
      const name = newNames[i];
      const email = `${name.toLowerCase()}@academia.edu`;
      const role = i < 3 ? 'Teacher' : 'Student';
      
      const user = await User.create({
        username: name,
        email,
        password: hashSHA256('password123'),
        role,
        isApproved: false, // Start as pending
        title: role === 'Teacher' ? 'Lecturer' : 'Freshman',
        profession: role === 'Teacher' ? 'Academic' : 'Student',
        department: 'Computer Science'
      });
      console.log(`Registered pending ${role}: ${name} (${email})`);
      users.push(user);
    }

    console.log('\n--- 3. Simulating Admin approval flow ---');
    for (const user of users) {
      user.isApproved = true;
      await user.save();
      console.log(`Admin approved user: ${user.username}`);
    }

    const teachers = users.filter(u => u.role === 'Teacher');
    const students = users.filter(u => u.role === 'Student');

    console.log('\n--- 4. Setting Up Classrooms ---');
    const classrooms = [];
    const classNames = ['Algorithms CS-301', 'Calculus II MATH-201', 'Database Systems CS-402'];
    
    // Clear old classrooms to ensure clean slate
    await Classroom.deleteMany({ name: { $in: classNames } });

    for (let i = 0; i < classNames.length; i++) {
      const className = classNames[i];
      const teacher = teachers[i % teachers.length];
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const classroom = await Classroom.create({
        name: className,
        code,
        teacher: teacher._id,
        students: [],
        announcements: [],
        sharedNotes: [],
        classRepresentatives: []
      });
      console.log(`Created Classroom: ${className} (Code: ${code}) under Teacher: ${teacher.username}`);
      classrooms.push(classroom);
    }

    console.log('\n--- 5. Simulating 30 to 40 Interactions Per User ---');
    
    // We will simulate exactly 35 interactions per user
    for (let userIdx = 0; userIdx < users.length; userIdx++) {
      const activeUser = users[userIdx];
      console.log(`\nSimulating 35 interactions for user: ${activeUser.username} (${activeUser.role})...`);

      for (let interactionNum = 1; interactionNum <= 35; interactionNum++) {
        const otherUsers = users.filter(u => u._id.toString() !== activeUser._id.toString());
        const targetUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        const targetTeacher = teachers[Math.floor(Math.random() * teachers.length)];
        const targetStudent = students[Math.floor(Math.random() * students.length)];
        const randomClass = classrooms[Math.floor(Math.random() * classrooms.length)];

        const type = Math.floor(Math.random() * 10);

        switch (type) {
          case 0: {
            // Interaction: Create a Folder
            const folderName = `Folder_${activeUser.username}_${interactionNum}`;
            await Folder.create({
              name: folderName,
              owner: activeUser._id,
              parentFolder: null,
              notes: []
            });
            break;
          }
          case 1: {
            // Interaction: Create a Note
            const noteTitle = `Note_${activeUser.username}_Lec_${interactionNum}`;
            const note = await Note.create({
              title: noteTitle,
              description: `Lecture notes summary details for ${noteTitle}`,
              fileUrl: `/uploads/notes/${activeUser.username}_sample.pdf`,
              fileType: 'application/pdf',
              fileSize: 1024 * interactionNum,
              category: 'Lecture Notes',
              uploader: activeUser._id,
              approved: true,
              classroom: null
            });

            const userFolder = await Folder.findOne({ owner: activeUser._id });
            if (userFolder) {
              userFolder.notes.push(note._id);
              await userFolder.save();
            }
            break;
          }
          case 2: {
            // Interaction: Rate a Note
            const randomNote = await Note.findOne({ uploader: { $ne: activeUser._id } });
            if (randomNote) {
              randomNote.ratings = randomNote.ratings.filter(r => r.user.toString() !== activeUser._id.toString());
              randomNote.ratings.push({
                user: activeUser._id,
                rating: Math.floor(Math.random() * 2) + 4
              });
              await randomNote.save();
            }
            break;
          }
          case 3: {
            // Interaction: Comment on a Note
            const randomNote = await Note.findOne({ uploader: { $ne: activeUser._id } });
            if (randomNote) {
              randomNote.comments.push({
                user: activeUser._id,
                username: activeUser.username,
                text: `Very helpful material, thanks for sharing!`
              });
              await randomNote.save();
            }
            break;
          }
          case 4: {
            // Interaction: Join Classroom
            if (activeUser.role === 'Student') {
              if (!randomClass.students.includes(activeUser._id)) {
                randomClass.students.push(activeUser._id);
                await randomClass.save();
              }
            }
            break;
          }
          case 5: {
            // Interaction: Classroom Announcement or Comment
            if (activeUser.role === 'Teacher') {
              const ownClass = classrooms.find(c => c.teacher.toString() === activeUser._id.toString());
              if (ownClass) {
                ownClass.announcements.push({
                  text: `Weekly update announcement #${interactionNum}. Remember to check folder storage notes.`,
                  sender: activeUser.username,
                  createdAt: new Date(),
                  comments: []
                });
                await ownClass.save();
              }
            } else {
              const announcementClass = classrooms.find(c => c.announcements.length > 0);
              if (announcementClass) {
                const targetAnn = announcementClass.announcements[Math.floor(Math.random() * announcementClass.announcements.length)];
                targetAnn.comments.push({
                  text: `Noted, thank you!`,
                  sender: activeUser.username,
                  user: activeUser._id,
                  createdAt: new Date()
                });
                await announcementClass.save();
              }
            }
            break;
          }
          case 6: {
            // Interaction: Q&A Question or Answer
            if (activeUser.role === 'Student') {
              await Interaction.create({
                student: activeUser._id,
                teacher: targetTeacher._id,
                question: `Could you clarify the topic of slide #${interactionNum}?`,
                status: 'Pending'
              });
            } else {
              const pendingQ = await Interaction.findOne({ teacher: activeUser._id, status: 'Pending' });
              if (pendingQ) {
                pendingQ.answer = `I have updated the folder notes with detailed slides on topic #${interactionNum}.`;
                pendingQ.status = 'Answered';
                pendingQ.answeredAt = new Date();
                await pendingQ.save();
              }
            }
            break;
          }
          case 7: {
            // Interaction: Send a Chat Message
            await Chat.create({
              sender: activeUser._id,
              recipient: targetUser._id,
              message: `Hey ${targetUser.username}, let's work on the team project together.`
            });
            break;
          }
          case 8: {
            // Interaction: Add Reaction to Chat Message
            const chatMsg = await Chat.findOne({
              $or: [
                { sender: activeUser._id },
                { recipient: activeUser._id }
              ]
            });
            if (chatMsg) {
              const emojis = ['👍', '❤️', '😂', '🎉'];
              chatMsg.reactions = chatMsg.reactions.filter(r => r.user.toString() !== activeUser._id.toString());
              chatMsg.reactions.push({
                user: activeUser._id,
                username: activeUser.username,
                emoji: emojis[Math.floor(Math.random() * emojis.length)]
              });
              await chatMsg.save();
            }
            break;
          }
          case 9: {
            // Interaction: Bookmark a Note
            const randomNote = await Note.findOne();
            if (randomNote) {
              if (!activeUser.bookmarks.includes(randomNote._id)) {
                activeUser.bookmarks.push(randomNote._id);
                await activeUser.save();
                randomNote.bookmarksCount = (randomNote.bookmarksCount || 0) + 1;
                await randomNote.save();
              }
            }
            break;
          }
        }
      }
      console.log(`✓ Completed 35 interactions for ${activeUser.username}`);
    }

    console.log('\n=============================================');
    console.log('SUCCESS: 20 brand new users and 700 interactions seeded!');
    console.log('=============================================');
  } catch (err) {
    console.error('Error seeding interactions:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSeed();
