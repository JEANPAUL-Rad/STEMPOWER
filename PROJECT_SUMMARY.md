# 🎓 E-Learning Backend - Quick Overview

## 📋 What This Project Does

This is a **complete e-learning platform backend** that manages:
- 👨‍🎓 Student learning (courses, quizzes, assignments)
- 👨‍🏫 Admin content management
- 📚 Course structure (Weeks → Projects → Lessons)
- ✅ Student progress tracking
- 💬 Real-time quiz sessions
- 📧 Email notifications

---

## 🎯 Main Features

### **For Students**
- ✅ View courses organized by weeks
- ✅ Complete lessons and track progress
- ✅ Take timed quizzes with auto-submission
- ✅ Submit assignments with file uploads
- ✅ View resources and materials
- ✅ Access live sessions
- ✅ Track learning progress

### **For Admins**
- ✅ Manage users (approve/block students)
- ✅ Create and organize course content
- ✅ Create quizzes with questions and files
- ✅ Create assignments
- ✅ View student progress and submissions
- ✅ Manage registrations and payments
- ✅ Schedule live sessions

---

## 🔧 How It Works

```
User Signs Up
    ↓
Admin Approves Account
    ↓
Student Logs In
    ↓
Views Courses (Weeks → Projects → Lessons)
    ↓
Completes Lessons & Takes Quizzes
    ↓
Submits Assignments
    ↓
Tracks Progress
```

---

## 📦 Key Components

### **1. Authentication System**
- Registration → Email Confirmation → Admin Approval → Login
- JWT tokens for secure access
- Role-based permissions (Admin/Student)

### **2. Course Structure**
```
Weeks
  └── Projects
      └── Lessons
          └── Quizzes/Assignments
```

### **3. Quiz System**
- Scheduled quizzes with auto-start/end
- Time limits with countdown
- File-based questions (PDF, images)
- Real-time WebSocket connection
- Automatic submission on timeout

### **4. File Management**
- Upload: Assignments, quiz files, lesson materials
- Storage: Local disk + Cloudinary (images)
- Download: Secure file serving

### **5. Background Services**
- **Quiz Timer**: Checks every 30 seconds for auto-start/end
- **Email Service**: Sends confirmation and notification emails
- **WebSocket**: Real-time quiz session updates

---

## 🗂️ Project Organization

```
src/
├── controllers/    → Handle HTTP requests
├── models/         → Database queries
├── routes/         → API endpoints
├── middleware/     → Auth, file upload
├── services/       → Email, WebSocket, timers
└── utils/          → Helper functions
```

---

## 🔌 Main API Endpoints

| Purpose | Route | Access |
|---------|-------|--------|
| Sign up | `POST /api/v1/users/register` | Public |
| Login | `POST /api/v1/users/login` | Public |
| Get courses | `GET /api/v1/student/weeks` | Student |
| Submit quiz | `POST /api/v1/student/quizzes/:id/submit` | Student |
| Create quiz | `POST /api/v1/admin/quizzes` | Admin |
| Approve user | `PATCH /api/v1/admin/users/:id/approve` | Admin |

---

## 🗄️ Database Tables

**Core:**
- `users` - User accounts
- `weeks` - Course weeks
- `projects` - Projects within weeks
- `lessons` - Lessons within projects

**Learning:**
- `quizzes` - Quiz definitions
- `quiz_questions` - Quiz questions
- `quiz_sessions` - Active quiz sessions
- `quiz_submissions` - Completed quizzes
- `assignments` - Assignment definitions
- `assignment_submissions` - Student submissions
- `progress` - Student progress tracking

**Admin:**
- `register` - Course registrations
- `resources` - Learning resources
- `live_sessions` - Scheduled live sessions
- `contacts` - Contact messages

---

## 🛠️ Technologies

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT + Bcrypt
- **Real-time**: Socket.io (WebSocket)
- **File Storage**: Multer + Cloudinary
- **Email**: Brevo (Sendinblue)
- **Time**: CAT timezone (UTC+2)

---

## ⚡ Special Features

1. **Auto-Quiz Management**: Background service automatically starts/ends quizzes
2. **Real-time Updates**: WebSocket for live quiz sessions
3. **File Support**: Upload PDFs, images for questions and assignments
4. **Timezone Handling**: CAT timezone for quiz scheduling
5. **Payment Tracking**: Integration for course registration payments

---

## 🔄 Request Flow Example

**Student Submitting Quiz:**
```
Frontend → POST /student/quizzes/:id/submit
    ↓
Routes → student.routes.js
    ↓
Middleware → authenticate + mapFilesToAnswers
    ↓
Controller → student.controller.submitQuiz()
    ↓
Model → student.model.saveQuizSubmission()
    ↓
Database → INSERT INTO quiz_submissions
    ↓
WebSocket → Broadcast result to admin
    ↓
Response → Success with score
```

---

**Summary**: A full-featured e-learning backend with course management, quizzes, assignments, real-time features, and admin controls. 🚀


