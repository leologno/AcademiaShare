const fs = require('fs');
const path = require('path');

const API = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE E2E VERIFICATION ---');

  // 1. Admin Login
  console.log('\n[1] Testing Admin Login...');
  const adminRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@academia.edu',
      password: 'admin123'
    })
  });
  const adminData = await adminRes.json();
  if (!adminRes.ok) throw new Error(JSON.stringify(adminData));
  console.log('Admin login OK:', adminData.username, '| Role:', adminData.role, '| Dept:', adminData.department);
  const adminToken = adminData.token;

  // 2. Teacher Login
  console.log('\n[2] Testing Teacher Login...');
  const teacherRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'teacher@academia.edu',
      password: 'teacher123'
    })
  });
  const teacherData = await teacherRes.json();
  if (!teacherRes.ok) throw new Error(JSON.stringify(teacherData));
  console.log('Teacher login OK:', teacherData.username, '| Role:', teacherData.role, '| Dept:', teacherData.department);
  const teacherToken = teacherData.token;

  // 3. Student Login
  console.log('\n[3] Testing Student Login...');
  const studentRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@academia.edu',
      password: 'student123'
    })
  });
  const studentData = await studentRes.json();
  if (!studentRes.ok) throw new Error(JSON.stringify(studentData));
  console.log('Student login OK:', studentData.username, '| Role:', studentData.role, '| Dept:', studentData.department);
  const studentToken = studentData.token;

  // 4. Note Upload by Teacher
  console.log('\n[4] Testing Note Upload by Teacher...');
  const formData = new FormData();
  formData.append('title', 'Data Structures & Algorithms Lecture 1');
  formData.append('description', 'Introduction to Big-O notation, Arrays and Linked Lists.');
  formData.append('category', 'Computer Science');
  const dummyFile = new Blob(['%PDF-1.4 sample test note content'], { type: 'application/pdf' });
  formData.append('noteFile', dummyFile, 'test_sample_note.pdf');

  const uploadRes = await fetch(`${API}/notes/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(JSON.stringify(uploadData));
  console.log('Teacher Note uploaded OK. ID:', uploadData._id, '| Approved:', uploadData.approved);
  const noteId = uploadData._id;

  // 5. Student fetches approved notes (same department)
  console.log('\n[5] Testing Student fetching approved notes...');
  const notesRes = await fetch(`${API}/notes`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const notesData = await notesRes.json();
  if (!notesRes.ok) throw new Error(JSON.stringify(notesData));
  console.log('Student fetched notes count:', notesData.length);
  const foundNote = notesData.find(n => n._id === noteId);
  if (!foundNote) throw new Error('Uploaded note not found in student query!');
  console.log('Found note title:', foundNote.title);

  // 6. Student rates note & comments & bookmarks
  console.log('\n[6] Testing Student Rating, Commenting & Bookmarking...');
  const rateRes = await fetch(`${API}/notes/${noteId}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ rating: 5 })
  });
  const rateData = await rateRes.json();
  if (!rateRes.ok) throw new Error(JSON.stringify(rateData));
  console.log('Rated note OK. New rating count:', rateData.ratings.length);

  const commentRes = await fetch(`${API}/notes/${noteId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ comment: 'Very clear explanation!' })
  });
  const commentData = await commentRes.json();
  if (!commentRes.ok) throw new Error(JSON.stringify(commentData));
  console.log('Commented on note OK. Comments count:', commentData.comments.length);

  const bookmarkRes = await fetch(`${API}/notes/${noteId}/bookmark`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const bookmarkData = await bookmarkRes.json();
  if (!bookmarkRes.ok) throw new Error(JSON.stringify(bookmarkData));
  console.log('Bookmarked note OK. Bookmarks count:', bookmarkData.bookmarksCount);

  // 7. Student Folder Management
  console.log('\n[7] Testing Folder Storage Creation & Adding Note...');
  const folderRes = await fetch(`${API}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ name: 'Algorithms 101' })
  });
  const folderData = await folderRes.json();
  if (!folderRes.ok) throw new Error(JSON.stringify(folderData));
  console.log('Folder created OK. ID:', folderData._id, '| Name:', folderData.name);
  const folderId = folderData._id;

  const addNoteToFolderRes = await fetch(`${API}/folders/${folderId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ noteId })
  });
  const addNoteToFolderData = await addNoteToFolderRes.json();
  if (!addNoteToFolderRes.ok) throw new Error(JSON.stringify(addNoteToFolderData));
  console.log('Note added to folder OK. Folder notes count:', addNoteToFolderData.folder.notes.length);

  // 8. Q&A Interaction: Student asks Teacher a question
  console.log('\n[8] Testing Q&A Interaction...');
  const askRes = await fetch(`${API}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      teacherId: teacherData._id,
      question: 'Could you explain amortized time complexity of dynamic array resizing?',
      noteId: noteId
    })
  });
  const askData = await askRes.json();
  if (!askRes.ok) throw new Error(JSON.stringify(askData));
  console.log('Question asked OK. ID:', askData._id, '| Status:', askData.status);
  const questionId = askData._id;

  // Teacher answers question
  const answerRes = await fetch(`${API}/interaction/${questionId}/answer`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      answerText: 'Amortized time is O(1) because doubling table size happens infrequently (log N times).'
    })
  });
  const answerData = await answerRes.json();
  if (!answerRes.ok) throw new Error(JSON.stringify(answerData));
  console.log('Teacher answered question OK. Answer:', answerData.answer);

  // Student upvotes question
  const upvoteRes = await fetch(`${API}/interaction/${questionId}/upvote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const upvoteData = await upvoteRes.json();
  if (!upvoteRes.ok) throw new Error(JSON.stringify(upvoteData));
  console.log('Upvoted question OK. Upvotes count:', upvoteData.upvotes.length);

  // Student resolves question
  const resolveRes = await fetch(`${API}/interaction/${questionId}/resolve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const resolveData = await resolveRes.json();
  if (!resolveRes.ok) throw new Error(JSON.stringify(resolveData));
  console.log('Question resolved OK. Status:', resolveData.status);

  // 9. Classroom Management
  console.log('\n[9] Testing Classroom Creation & Student Join...');
  const classRes = await fetch(`${API}/classrooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      name: 'CS201: Data Structures',
      subject: 'Computer Science',
      description: 'Fall Semester Classroom'
    })
  });
  const classData = await classRes.json();
  if (!classRes.ok) throw new Error(JSON.stringify(classData));
  console.log('Classroom created OK. Name:', classData.name, '| Code:', classData.code);
  const classCode = classData.code;
  const classroomId = classData._id;

  // Student joins classroom
  const joinRes = await fetch(`${API}/classrooms/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ code: classCode })
  });
  const joinData = await joinRes.json();
  if (!joinRes.ok) throw new Error(JSON.stringify(joinData));
  console.log('Student joined classroom OK:', joinData.classroom?.name || joinData.name);

  // Teacher posts announcement
  const annRes = await fetch(`${API}/classrooms/${classroomId}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      text: 'The midterm exam will take place next Monday at 10 AM.'
    })
  });
  const annData = await annRes.json();
  if (!annRes.ok) throw new Error(JSON.stringify(annData));
  console.log('Announcement posted OK:', annData[0]?.text || annData[0]?.title || 'Success');

  // 10. Admin moderation
  console.log('\n[10] Testing Admin Panel APIs...');
  const adminUsersRes = await fetch(`${API}/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminUsersData = await adminUsersRes.json();
  if (!adminUsersRes.ok) throw new Error(JSON.stringify(adminUsersData));
  console.log('Admin fetched user count:', adminUsersData.length);

  const adminClassesRes = await fetch(`${API}/admin/classrooms`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminClassesData = await adminClassesRes.json();
  if (!adminClassesRes.ok) throw new Error(JSON.stringify(adminClassesData));
  console.log('Admin fetched classrooms count:', adminClassesData.length);

  console.log('\n============================================================');
  console.log('>>> 100% OF END-TO-END INTEGRATION CHECKS PASSED SUCCESSFULLY! <<<');
  console.log('============================================================');
}

runTests().catch(err => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
