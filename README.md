# Study Notes Sharing Platform (Advanced)

A full-stack, real-time academic platform for students, teachers, and admins to share, rate, bookmark study notes, participate in Q&A, chat, and manage files in nested folders.

---

## Technical Stack

* **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.IO, Multer (local disk storage).
* **Frontend**: React.js, Axios, React Router, Socket.IO Client, Tailwind CSS (Vanilla compilation), Lucide Icons.

---

## Folder Structure

```
study-notes-sharing-platform/
├── server/          # Express backend & Socket.IO
│   ├── uploads/     # Target upload folder for PDFs, images, etc.
│   └── ...          # Models, routes, controllers
└── client/          # Vite React frontend
    └── ...          # Pages, components, assets
```

---

## Setup Instructions

### 1. Prerequisites
Ensure you have the following installed:
* **Node.js** (v18 or higher recommended)
* **MongoDB** (running locally on port `27017` or a MongoDB Atlas URI)

### 2. Backend Setup
1. Open a terminal in the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Check the `.env` configuration file in `server/`. It contains:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.5.1:27017/studynotes
   JWT_SECRET=supersecretkeystudynotesplatform
   ```
4. Start the backend:
   ```bash
   npm start
   ```
   *The server should run on http://localhost:5000.*

### 3. Frontend Setup
1. Open another terminal in the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The client should start on http://localhost:5173.*

---

## Step-by-Step Test Guide

To verify all the advanced features of the platform, run through this local verification flow:

### 1. Account Creation
1. Open two browser windows: one normal and one incognito (or another browser).
2. Register **User A** (role **Student**) in the first window.
3. Register **User B** (role **Teacher**) in the second window.
4. Register **User C** (role **Admin**) to test moderation actions.

### 2. Note Upload & Moderation
1. **Student** logs in and clicks **Upload Note**. Fills in details (e.g. Calculus Guide, Category: Mathematics) and attaches a PDF or image file, then submits.
2. The note will *not* immediately appear in the **Study Notes Explorer** because Student uploads require moderation.
3. Log in as **Admin**. Click **Admin** in the Navbar, then go to **Pending Approvals**.
4. You will see the student's upload. Click **Approve Note**.
5. Log back in as **Student**. Go to **Study Notes**. The Calculus Guide will now be visible!

### 3. Ratings, Comments & Bookmarks
1. Go to **Study Notes** as the Student or Teacher. Click the note card to open its detailed drawer.
2. **Add a rating** using the interactive star rating selector. The average rating will update.
3. **Submit comments** to chat about the notes. The comment list updates.
4. Click **Save to Bookmarks**.
5. Go to your **Profile** page. The note is now listed under your bookmarks list.

### 4. Folder File Storage
1. Go to **Storage** in the Navbar.
2. Click **New Folder** and create a folder named `Semester 1`.
3. Click the folder to enter it.
4. Click **Add Note Here**. Choose your bookmarked notes from the dropdown, and click **Add File**.
5. You can now view and download these files directly from your personal storage hierarchy.

### 5. Student-Teacher Interaction (Q&A)
1. Log in as **Student**. Go to the **Q&A** page.
2. Fill out the "Ask a Teacher" form: select **User B** (Teacher), type your question, and submit.
3. Switch to the **Teacher** browser window. A real-time notification alert will fire.
4. Go to **Q&A** as the Teacher. You will see the pending question.
5. Click **Provide Answer**, type your response, and click **Submit Answer**.
6. Switch back to the **Student** window. A real-time notification will confirm the teacher's response has arrived.

### 6. Real-Time Chat
1. Go to **Chats** in the Navbar in both windows (Student and Teacher).
2. Search for the other user's username using the search input to initiate a conversation channel.
3. Type messages. They will render instantly on both sides using Socket.IO without page reloading.
