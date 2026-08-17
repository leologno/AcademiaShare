# Project Overview & Execution Guide

This document provides a comprehensive guide to understanding the **Study Notes Sharing Platform** codebase, its architectural components, file structure, and step-by-step instructions on running it locally from your VSCode terminal.

---

## 📂 Project Directory Structure

The project is structured as a full-stack JavaScript application split into a `client` (frontend) and `server` (backend).

```text
StudyGuide/
├── client/                     # Vite React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI Components
│   │   │   ├── Navbar.jsx            # Dynamic Navigation bar with routing & theme controls
│   │   │   ├── NotificationBell.jsx  # Notification tray showing real-time messages/alerts
│   │   │   ├── ProtectedRoute.jsx    # Role-based route guard preventing unauthorized access
│   │   │   └── Rating.jsx            # Star rating visual widget
│   │   ├── context/            # Global React Context State
│   │   │   ├── AuthContext.jsx       # User authentication, JWT session persistence & Socket.IO connection
│   │   │   └── ThemeContext.jsx      # Application-wide theme toggling (Light/Dark mode)
│   │   ├── pages/              # Page Views / Routes
│   │   │   ├── AdminPanel.jsx        # Admin approvals for study notes & user ban control
│   │   │   ├── Chat.jsx              # Real-time private chat interface between users
│   │   │   ├── Classrooms.jsx        # Student-Teacher virtual classrooms (announcements, notes sharing)
│   │   │   ├── Dashboard.jsx         # Home view showing quick stats, summary cards & recent updates
│   │   │   ├── FolderStorage.jsx     # Nested personal cloud drive for bookmark file organization
│   │   │   ├── Interactions.jsx      # Q&A panel where students ask questions & teachers provide answers
│   │   │   ├── Login.jsx             # User Sign In page
│   │   │   ├── Notes.jsx             # Note Explorer (searching, uploading, rating & commenting on files)
│   │   │   ├── Pomodoro.jsx          # Focus timer with customized work/break cycles
│   │   │   ├── Profile.jsx           # User statistics, personal uploads & bookmarked notes
│   │   │   ├── Register.jsx          # User Sign Up page
│   │   │   └── Settings.jsx          # Edit profile name, email, and preferences
│   │   ├── utils/
│   │   │   └── api.js                # Axios instance with request interceptors to auto-attach JWT token headers
│   │   ├── App.jsx             # React Router routing layout configuration
│   │   ├── index.css           # Styling configuration (Tailwind directives + glassmorphism UI classes)
│   │   └── main.jsx            # Application entry point mounting providers
│   ├── package.json            # Frontend script tasks and library dependencies
│   └── vite.config.js          # Vite config containing proxy server routing for local API development
│
├── server/                     # Express & Node.js Backend
│   ├── controllers/            # Controller layer containing route business logic
│   │   ├── adminController.js        # Moderating note uploads, deleting/suspending accounts
│   │   ├── authController.js         # User registration, login hash validations & token issuance
│   │   ├── chatController.js         # Fetching conversational logs between two chat users
│   │   ├── classroomController.js    # Creating classrooms, joining via code, sharing notes & announcements
│   │   ├── folderController.js       # Managing nested student folders & adding notes into sub-directories
│   │   ├── interactionController.js  # Managing Student-Teacher Q&A queries and answer records
│   │   ├── noteController.js         # Uploading, rating, commenting on notes & saving bookmarks
│   │   └── notificationController.js  # Fetching notifications & marking alerts as read/unread
│   ├── middleware/
│   │   └── auth.js                   # JWT verification middleware & role validation rules
│   ├── models/                 # Mongoose Schemas (MongoDB)
│   │   ├── Chat.js                   # Chat Message Schema (sender, recipient, message text)
│   │   ├── Classroom.js              # Classrooms Schema (students joined, announcements, shared note lists)
│   │   ├── Folder.js                 # Nested Folder Schema (owner, parentFolder self-reference, note list)
│   │   ├── Interaction.js            # Q&A Schema (student reference, teacher reference, question, answer)
│   │   ├── Note.js                   # Study Notes Schema (file metrics, ratings list, comments list, approval state)
│   │   ├── Notification.js           # Notification Schema (recipient, sender, status, type, message preview)
│   │   └── User.js                   # User Account Schema (username, credentials, role, bookmark list)
│   ├── routes/                 # Endpoint routing mapping routes to controllers
│   ├── uploads/                # Local directory for stored uploaded documents (PDFs, images, etc.)
│   ├── server.js               # Backend entry point: starts Express server, connects DB & maps Socket.IO events
│   └── package.json            # Backend script tasks and library dependencies
```

---

## ⚙️ How Everything Works Under the Hood

### 1. Data Models & Relationships (MongoDB)
The core database relationships revolve around the **User** roles: `Student`, `Teacher`, and `Admin`.
- **Note Sharing**: When a student uploads a study guide, it is added to the `Note` collection with `approved: false` (requires Admin review). If a teacher uploads it, it is automatically approved.
- **Bookmarks**: Users can bookmark notes. The note's `bookmarksCount` increment is tracked, and the note is pushed to the user's `bookmarkedNotes` array in the `User` model.
- **Nested Storage**: Students can organize bookmarked notes into a custom hierarchy using the `Folder` schema, which utilizes a `parentFolder` property that references another `Folder` document (allowing unlimited folder nesting).
- **Q&A System**: The `Interaction` model tracks academic Q&A. A student asks a question assigned to a specific teacher ID. The teacher responds, which updates the `answer` and `answeredAt` fields.
- **Classrooms**: A teacher can construct a virtual room. The database creates a `Classroom` with a randomized upper-case class code. Students search and join by code, granting them access to classroom announcements and teacher-curated shared notes.

### 2. Authentication & Authorization Flow
- **Registration & Login**: Passwords are encrypted using `bcryptjs`. On successful login, the server issues a JSON Web Token (JWT) containing the user ID and role.
- **Client Session Preservation**: The client saves the token and user details in `localStorage`.
- **Axios Interceptor**: The client uses `client/src/utils/api.js` which automatically intercepts every HTTP request and attaches the JWT to the `Authorization: Bearer <token>` header.
- **Role Verification Middleware**: On the backend, `server/middleware/auth.js` validates the token and checks user roles before processing restricted endpoints (e.g. only `Admin` can call approval routes).

### 3. Real-Time Communication (Socket.IO)
Websockets enable instant page-updates without reloading:
- Upon login, the client establishes a Socket.IO connection.
- The client emits a `join` event with their user ID. The backend server maps that socket to a private room named after the user's ID.
- **Live Chats**: When user A sends a message to user B, the client emits `chat:send` to the socket. The server writes the message to the database, emits `chat:receive` to user A and user B's rooms, and inserts a notification in the DB.
- **Live Notifications**: When a student posts a Q&A question (`qa:question`) or a teacher responds (`qa:answer`), the server automatically emits `notification:receive` to the respective user's room to trigger a popup alert on their interface immediately.

### 4. Resilient Database Layer
To make setup completely zero-config, the backend features a dual-mode database connection:
1. It tries to connect to a local MongoDB instance on port `27017` (e.g., `mongodb://127.0.0.1:27017/studynotes`).
2. If no database is running on the system, it automatically spawns an in-memory database using `mongodb-memory-server`.
3. In both modes, it runs a seeder function (`seedDatabase`) to create default credentials (`admin`, `teacher`, and `student` accounts) if they don't already exist.

---

## 🚀 How to Start the Project from VSCode Terminal

Since you need both the backend and frontend running simultaneously, you should launch them in two separate terminal windows (or split terminal shells) inside VSCode.

### Step 1: Open VSCode Terminal
1. Open the project root directory (`StudyGuide`) in VSCode.
2. Open a new terminal: Press **`` Ctrl + ` ``** (Control + Backtick) or go to **Terminal** -> **New Terminal**.

### Step 2: Start the Backend (Server)
In your first terminal tab:
```bash
# Navigate to the server folder
cd server

# Install dependencies (only required the first time)
npm install

# Start the server (runs on http://localhost:5000)
npm run dev
```

### Step 3: Start the Frontend (Client)
Create a new terminal tab (click the **`+`** icon or the **Split Terminal** icon in VSCode's terminal panel):
```bash
# Navigate to the client folder
cd client

# Install dependencies (only required the first time)
npm install

# Start the React Vite dev server (runs on http://localhost:5173)
npm run dev
```

---

## 👥 Seed Credentials for Testing

You can use the following default accounts created automatically during database startup:

| Role | Username | Email | Password | What to Test |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@academia.edu` | `admin123` | Moderate notes, approve/reject uploads, view user list |
| **Teacher** | `teacher` | `teacher@academia.edu` | `teacher123` | Create classrooms, make announcements, answer Q&A, upload notes |
| **Student** | `student` | `student@academia.edu` | `student123` | Upload notes, ask questions, rate files, save bookmarks, join classrooms |

---

## 🧪 Recommended Test Walkthrough

To verify how the systems work:
1. Open a browser window at `http://localhost:5173` and log in as `student`.
2. Open an incognito browser window and log in as `teacher` or `admin`.
3. **Test Chat**: Go to the **Chats** page on both accounts, search for the other user's username, and send a message. You will see it appear in real-time.
4. **Test Q&A**: As the student, ask `teacher` a question under **Q&A**. The teacher will receive a real-time notification, can reply, and the student will get an instant answer notification.
5. **Test Notes & Admin Approvals**: Upload a note as `student`. Notice it won't appear on the public board. Log in as `admin`, go to **Admin Panel**, and click **Approve**. Now it will appear publicly.
