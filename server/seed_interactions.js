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

    const names = [
      'Lgno', 'Tanin', 'Rakib', 'Proma', 'Rimpy', 'Sreejonty',
      'Ahsan', 'Mahmud', 'Arif', 'Sajib', 'Naim', 'Fahad',
      'Milon', 'Shakil', 'Rony', 'Imran', 'Hasan', 'Kabir',
      'Zahid', 'Joy'
    ];

    const users = [];

    console.log('\n--- 1. Creating and Approving 20 Users ---');
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const email = `${name.toLowerCase()}@academia.edu`;
      
      // Exclude duplicate usernames or emails
      let user = await User.findOne({ username: name });
      if (!user) {
        // First 3 users are Teachers, rest are Students
        const role = i < 3 ? 'Teacher' : 'Student';
        user = await User.create({
          username: name,
          email,
          password: hashSHA256('password123'),
          role,
          isApproved: true,
          title: role === 'Teacher' ? 'Lecturer' : 'Freshman',
          profession: role === 'Teacher' ? 'Academic' : 'Student',
          department: 'Computer Science'
        });
        console.log(`Created approved ${role}: ${name} (${email})`);
      } else {
        user.isApproved = true;
        await user.save();
        console.log(`User already exists, set approved: ${name}`);
      }
      users.push(user);
    }

    const teachers = users.filter(u => u.role === 'Teacher');
    const students = users.filter(u => u.role === 'Student');

    console.log('\n--- 2. Setting Up Seed Classrooms ---');
    const classrooms = [];
    const classNames = ['Algorithms CS-301', 'Calculus II MATH-201', 'Database Systems CS-402'];
    for (let i = 0; i < classNames.length; i++) {
      const className = classNames[i];
      const teacher = teachers[i % teachers.length];
      
      let classroom = await Classroom.findOne({ name: className });
      if (!classroom) {
        // Generate random 6 character code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        classroom = await Classroom.create({
          name: className,
          code,
          teacher: teacher._id,
          students: [],
          announcements: [],
          sharedNotes: [],
          classRepresentatives: []
        });
        console.log(`Created Classroom: ${className} (Code: ${code}) under Teacher: ${teacher.username}`);
      }
      classrooms.push(classroom);
    }

    console.log('\n--- 3. Running 20 to 30 Interactions Per User ---');
    
    // We will run exactly 25 interactions for every user
    for (let userIdx = 0; userIdx < users.length; userIdx++) {
      const activeUser = users[userIdx];
      console.log(`\nSimulating interactions for user: ${activeUser.username} (${activeUser.role})...`);

      for (let interactionNum = 1; interactionNum <= 25; interactionNum++) {
        const otherUsers = users.filter(u => u._id.toString() !== activeUser._id.toString());
        const targetUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        const targetTeacher = teachers[Math.floor(Math.random() * teachers.length)];
        const targetStudent = students[Math.floor(Math.random() * students.length)];
        const randomClass = classrooms[Math.floor(Math.random() * classrooms.length)];

        // Randomly pick one of the 10 interaction types
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

            // Put note inside a random folder owned by this user
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
              // Remove previous rating if any
              randomNote.ratings = randomNote.ratings.filter(r => r.user.toString() !== activeUser._id.toString());
              randomNote.ratings.push({
                user: activeUser._id,
                rating: Math.floor(Math.random() * 2) + 4 // 4 or 5 star ratings
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
                text: `Great notes! Really helped with learning this topic.`
              });
              await randomNote.save();
            }
            break;
          }
          case 4: {
            // Interaction: Join a Classroom (Enroll student)
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
              // Teacher adds announcement
              const ownClass = classrooms.find(c => c.teacher.toString() === activeUser._id.toString());
              if (ownClass) {
                ownClass.announcements.push({
                  text: `Important announcement for lecture ${interactionNum}. Please complete the assignment on time.`,
                  sender: activeUser.username,
                  createdAt: new Date(),
                  comments: []
                });
                await ownClass.save();
              }
            } else {
              // Student comments on an announcement
              const announcementClass = classrooms.find(c => c.announcements.length > 0);
              if (announcementClass) {
                const targetAnn = announcementClass.announcements[Math.floor(Math.random() * announcementClass.announcements.length)];
                targetAnn.comments.push({
                  text: `Thanks for the update, professor.`,
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
            // Interaction: Q&A Question (Student) or Answer (Teacher)
            if (activeUser.role === 'Student') {
              await Interaction.create({
                student: activeUser._id,
                teacher: targetTeacher._id,
                question: `Professor ${targetTeacher.username}, how do we approach problem ${interactionNum}?`,
                status: 'Pending'
              });
            } else {
              // Teacher answers a pending question
              const pendingQ = await Interaction.findOne({ teacher: activeUser._id, status: 'Pending' });
              if (pendingQ) {
                pendingQ.answer = `You should use integration by parts for problem ${interactionNum}.`;
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
              message: `Hey ${targetUser.username}, let's form a study group for exam preparation!`
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
      console.log(`✓ Completed 25 interactions for ${activeUser.username}`);
    }

    console.log('\n=============================================');
    console.log('SUCCESS: All 20 users and 500 interactions seeded!');
    console.log('=============================================');
  } catch (err) {
    console.error('Error seeding interactions:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSeed();
