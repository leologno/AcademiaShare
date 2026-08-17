# AI Prompt Guide: Project Report & Presentation Slides

This document contains tailored, humanized prompts designed for AI models (such as Gemini 1.5 Pro, GPT-4o, or Claude 3.5 Sonnet) to generate a comprehensive project report and a slide presentation deck for **AcademiaShare**.

All prompts reference the project repository directly: **https://github.com/leologno/AcademiaShare**

---

## Prompt 1: Generate the Full Project Report

### How to use:
Copy the prompt below into your AI assistant. It will guide the AI to generate a detailed, structured academic/technical report.

```text
Please write a comprehensive, professional project report for my web application "AcademiaShare", which is hosted at: https://github.com/leologno/AcademiaShare

AcademiaShare is an advanced collaborative study notes and classroom platform built for students and teachers. 

To help you write the report, here is the technical background:
- Tech Stack: React (Vite, Tailwind CSS, Framer Motion, Lucide-react) for the client, and Node.js (Express, Socket.IO, Mongoose) for the server.
- Database: MongoDB.
- Key Features:
  1. Login & Registration with Admin-approval gate and secure SHA256 password hashing. Includes custom password visibility toggles.
  2. Main Dashboard with sleek Aceternity UI cards and Meteor animations.
  3. Classroom workspace containing a real-time WebRTC video grid, chat streams, interactive shared whiteboard, and class roster.
  4. Material Sharing: Uploading and sharing notes in categories (Lecture Notes, Assignment, Exam Prep, Syllabus) restricted within classrooms.
  5. File/Folder storage: Personal directory management for notes.
  6. Interactive Q&A: Students ask questions, teachers answer, and others can upvote.
  7. Direct Messaging: Real-time user chats with attachments, reactions, message deletion, and notification counts that clear automatically upon viewing.
  8. Security: Hardened inputs against NoSQL injections and ObjectId schema-casting failures.

Please structure the report with the following sections:
1. Title Page and Executive Summary.
2. Introduction (Problem statement, motivation, and solution overview).
3. Project Architecture (Client-server division, real-time messaging using Socket.IO, and WebRTC streaming flows).
4. Detailed Feature Breakdown (Functional description of all modules listed above).
5. Database Design & Models (Explain the schemas for User, Note, Classroom, Folder, Chat, Notification, and Interaction).
6. Security & Hardening Measures (Detailing SHA256 migration, input sanitization, and CastError crash prevention).
7. Conclusion & Future Scope (Reflections, lessons learned, and next phases).

Make the tone highly professional, academic, yet practical. Ensure you explain how socket events and database models interact.
```

---

## Prompt 2: Generate the Presentation Slide Deck & Script

### How to use:
Copy the prompt below into your AI assistant. It will guide the AI to generate a slide-by-slide structure, bullet points, and speaker notes.

```text
Please create a complete presentation slide deck structure and matching speaker script for my project "AcademiaShare". You can reference the repository here: https://github.com/leologno/AcademiaShare

I need a total of 10 to 12 slides. For each slide, please provide:
1. Slide Title
2. Visual Layout / Graphic Idea (Description of what should be displayed on screen)
3. Bullet Points (The actual text shown on the slide)
4. Speaker Notes (A natural, humanized script for me to read out loud during the presentation)

The slide deck should follow this outline:
- Slide 1: Title Slide (AcademiaShare: Advanced Collaborative Study Notes Platform)
- Slide 2: Problem Statement (What issues do students and teachers face with scattered notes and static video tools?)
- Slide 3: The Solution (Introducing AcademiaShare as a unified, real-time platform)
- Slide 4: Key System Architecture (Frontend React, Backend Express/Node, MongoDB, Socket.IO, and WebRTC)
- Slide 5: Classroom & Live Session Workspace (WebRTC streaming, live whiteboard, and class representatives)
- Slide 6: Study Notes Sharing & Folder Storage (Personal folders and classroom isolated note sharing)
- Slide 7: Real-Time Chat & Notification System (Direct messaging, file attachments, instant reactions, and sync checks)
- Slide 8: Interactive Student-Teacher Q&A (Resolving doubts, upvotes, and resolution statuses)
- Slide 9: Security Hardening (SHA256 password hashing, NoSQL injection prevention, and parameter cast-error checks)
- Slide 10: Technical Challenges & Solutions (How we overcame dynamic port mappings for database fallback and socket reconnection loops)
- Slide 11: Future Enhancements (AI-generated note summaries, peer matching, and whiteboard recordings)
- Slide 12: Q&A / Thank You

Make the speaker notes sound natural, confident, and engaging. Avoid robotic phrasing; instead, write it like a student or developer presenting their capstone project.
```
