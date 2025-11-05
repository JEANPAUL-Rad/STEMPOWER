# 📚 Backend-E-learning Project Structure

## 🎯 Project Overview

**Backend-E-learning** is a comprehensive e-learning platform backend built with Node.js and Express. It supports course management, quizzes, assignments, live sessions, student progress tracking, and administrative features.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    E-LEARNING BACKEND                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Express    │───▶│   Routes     │───▶│ Controllers  │ │
│  │   Server     │    │              │    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                      │                    │        │
│         │                      ▼                    ▼        │
│         │              ┌──────────────┐    ┌──────────────┐ │
│         │              │ Middleware   │    │   Models     │ │
│         │              │ (Auth/Upload)│    │   (Database)  │ │
│         │              └──────────────┘    └──────────────┘ │
│         │                                               │    │
│         │                      │                         ▼   │
│         └──────────────────────┼────────────────────────────│
│                                │                             │
│         ┌──────────────────────┴──────────┐                │
│         │                                   │                │
│    ┌────▼────┐                         ┌────▼────┐          │
│    │ Services│                         │  Utils  │          │
│    │         │                         │         │          │
│    │ • Email │                         │ • Files │          │
│    │ • Timer │                         │ • Cloud │          │
│    │ • Socket│                         │ • Time  │          │
│    └─────────┘                         └─────────┘          │
│                                                             │
│         ┌───────────────────────────────────┐              │
│         │     PostgreSQL Database           │              │
│         │  (Supabase/PostgreSQL)           │              │
│         └───────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
Backend-E-learning/
│
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                  # HTTP server + WebSocket setup
│   │
│   ├── config/
│   │   ├── db.js                  # Database connection & utilities
│   │   └── email.js               # Email configuration
│   │
│   ├── controllers/               # Request handlers
│   │   ├── admin/                 # Admin-specific controllers
│   │   │   ├── assignment.controller.js
│   │   │   ├── contact.controller.js
│   │   │   ├── lesson.controller.js
│   │   │   ├── live_session.controller.js
│   │   │   ├── progress.controller.js
│   │   │   ├── project.controller.js
│   │   │   ├── quiz.controller.js
│   │   │   ├── quiz_question.controller.js
│   │   │   ├── quiz_submission.controller.js
│   │   │   ├── resource.controller.js
│   │   │   ├── submission_answer.controller.js
│   │   │   └── week.controller.js
│   │   ├── admin.controller.js    # User management
│   │   ├── register.controller.js # Course registration
│   │   ├── student.controller.js  # Student features
│   │   └── user.controller.js     # Authentication
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT authentication
│   │   ├── requireAdmin.js        # Admin authorization
│   │   ├── upload.js              # File upload handling
│   │   ├── assignmentUpload.js     # Assignment-specific uploads
│   │   └── mapFilesToAnswers.js   # Map files to quiz answers
│   │
│   ├── models/                    # Database models (queries)
│   │   ├── admin/
│   │   │   ├── assignment.model.js
│   │   │   ├── contact.model.js
│   │   │   ├── lesson.model.js
│   │   │   ├── progress.model.js
│   │   │   ├── project.model.js
│   │   │   ├── quiz.model.js
│   │   │   ├── quiz_question.model.js
│   │   │   ├── quiz_choice.model.js
│   │   │   ├── quiz_submission.model.js
│   │   │   ├── resource.model.js
│   │   │   ├── submission_answer.model.js
│   │   │   └── week.model.js
│   │   ├── register.model.js
│   │   ├── student.model.js
│   │   └── user.model.js
│   │
│   ├── routes/                     # API route definitions
│   │   ├── admin/
│   │   │   ├── assignment.routes.js
│   │   │   ├── contact.routes.js
│   │   │   ├── lesson.routes.js
│   │   │   ├── live_session.routes.js
│   │   │   ├── progress.routes.js
│   │   │   ├── project.routes.js
│   │   │   ├── quiz.routes.js
│   │   │   ├── quiz_question.routes.js
│   │   │   ├── quiz_submission.routes.js
│   │   │   ├── resource.routes.js
│   │   │   ├── submission_answer.routes.js
│   │   │   └── week.routes.js
│   │   ├── admin.routes.js         # Admin user routes
│   │   ├── register.routes.js      # Registration routes
│   │   ├── student.routes.js       # Student routes
│   │   └── user.routes.js          # Auth routes
│   │
│   ├── services/                    # Business logic services
│   │   ├── mailService.js          # Email sending (Brevo)
│   │   ├── fileUploadService.js    # File upload handling
│   │   ├── quizTimerService.js    # Auto quiz start/end
│   │   └── websocketService.js     # Real-time WebSocket
│   │
│   └── utils/                      # Utility functions
│       ├── cloudinary.js           # Image upload
│       ├── email.js                # Email utilities
│       ├── fileHelper.js           # File operations
│       ├── saveFile.js             # File saving
│       ├── downloadFile.js         # File downloads
│       ├── timezone.js             # Timezone handling
│       ├── token.js                # Token utilities
│       └── response.util.js        # Response helpers
│
├── migrations/                      # Database migrations
│   ├── 001_create_users_table.sql
│   ├── 002_create_register_table.sql
│   ├── 003_alter_register_interests_nullable.sql
│   └── 004_alter_register_remove_interests_add_module.sql
│
├── uploads/                         # File storage
│   ├── quiz-files/
│   ├── quiz-submissions/
│   ├── assignments/
│   ├── assignment-submissions/
│   └── lessons/
│
├── package.json
└── .env                            # Environment variables
```

---

## 🎓 Core Features

### 1. **Authentication & Authorization**
- User registration with email confirmation
- JWT-based authentication
- Role-based access control (Admin, Student)
- Password reset functionality
- Session management

### 2. **Course Management**
- **Weeks**: Course structure by weeks
- **Projects**: Projects within weeks
- **Lessons**: Lessons within projects
- **Resources**: Additional learning materials
- Hierarchical organization: Week → Project → Lesson

### 3. **Quiz System**
- Create and manage quizzes
- Multiple choice questions
- File-based questions (PDF, images)
- Auto-start/auto-end quizzes
- Time limits with grace periods
- Real-time quiz sessions via WebSocket
- Automatic submission handling
- Quiz history tracking

### 4. **Assignment System**
- Assignment creation and distribution
- File upload for assignments
- Student submission with file uploads
- Submission tracking and grading

### 5. **Progress Tracking**
- Lesson completion tracking
- Student progress monitoring
- Course completion status
- Performance analytics

### 6. **Live Sessions**
- Schedule and manage live sessions
- Real-time communication support
- Session history

### 7. **Administrative Features**
- User management (approve/block students)
- Course content management
- Quiz and assignment administration
- Progress monitoring
- Registration management with payment tracking

### 8. **File Management**
- File uploads (assignments, quiz files)
- Cloud storage integration (Cloudinary)
- File downloads
- File serving endpoints

### 9. **Real-time Features**
- WebSocket support for quiz sessions
- Real-time quiz status updates
- Live session notifications

### 10. **Background Services**
- Quiz timer service (auto-start/end quizzes)
- Email notifications (Brevo/Sendinblue)
- Automated quiz session management

---

## 🔌 API Routes Structure

### **Base URL**: `/api/v1`

#### **Authentication Routes** (`/users`)
```
POST   /register              # User registration
GET    /confirm/:token        # Email confirmation
POST   /login                 # User login
POST   /logout                # User logout
POST   /forgot-password       # Request password reset
POST   /reset-password        # Reset password
GET    /check-session        # Check active session
```

#### **Registration Routes** (`/register`)
```
POST   /                      # Create registration
GET    /                      # List registrations (admin)
GET    /:id                   # Get registration by ID
PATCH  /:id/payment           # Update payment status
DELETE /:id                   # Delete registration (admin)
```

#### **Student Routes** (`/student`)
```
# Weeks & Projects
GET    /weeks                 # Get all weeks
GET    /weeks/:week_id/projects  # Get projects by week

# Projects & Lessons
GET    /projects              # Get all projects
GET    /projects/:project_id  # Get project details
GET    /projects/:project_id/lessons  # Get lessons by project

# Lessons
GET    /lessons/:lesson_id   # Get lesson details
POST   /lessons/:lesson_id/complete  # Mark lesson complete
GET    /lessons/:lesson_id/download  # Download lesson file

# Quizzes
GET    /quiz-history          # Get quiz history
GET    /project-quizzes       # Get all project quizzes
GET    /quizzes/:quiz_id     # Get quiz details
POST   /quizzes/:quiz_id/submit  # Submit quiz

# Progress
GET    /progress              # Get student progress

# Resources
GET    /resources            # Get all resources
GET    /resources/:resource_id  # Get resource details

# Dashboard
GET    /dashboard            # Get dashboard data
GET    /dashboard/courses    # Get courses
GET    /dashboard/projects-by-week  # Projects by week
GET    /dashboard/recent-activity  # Recent activity

# User Management
GET    /user-details         # Get user details
POST   /change-password      # Change password
PUT    /update-profile       # Update profile
DELETE /delete-account       # Delete account

# Live Sessions
GET    /live-sessions        # Get all live sessions

# Assignments
GET    /assignments          # Get student assignments
GET    /assignments/:assignment_id  # Get assignment details
POST   /assignments/:assignment_id/download  # Download assignment
POST   /assignments/:assignment_id/submit   # Submit assignment
GET    /my-submissions       # Get my submissions
GET    /download/submission/:submission_id  # Download submission
```

#### **Admin Routes** (`/admin`)
```
# User Management
PATCH  /users/:user_id/approve   # Approve student
PATCH  /users/:user_id/block     # Block student
PATCH  /users/:user_id/unblock   # Unblock student
GET    /users                    # List all users
GET    /user/:id                 # Get user by ID
PUT    /user/:id                 # Update user
DELETE /user/:id                 # Delete user

# Weeks
POST   /weeks                    # Create week
GET    /weeks                    # List weeks
GET    /weeks/:id                # Get week
PUT    /weeks/:id                # Update week
DELETE /weeks/:id                # Delete week

# Projects
POST   /projects                 # Create project
GET    /projects                 # List projects
GET    /projects/:id             # Get project
PUT    /projects/:id             # Update project
DELETE /projects/:id            # Delete project

# Lessons
POST   /lessons                  # Create lesson
GET    /lessons                  # List lessons
GET    /lessons/:id              # Get lesson
PUT    /lessons/:id              # Update lesson
DELETE /lessons/:id              # Delete lesson

# Quizzes
POST   /quizzes                  # Create quiz
GET    /quizzes                  # List quizzes
GET    /quizzes/:id              # Get quiz
PUT    /quizzes/:id              # Update quiz
DELETE /quizzes/:id              # Delete quiz
POST   /quizzes/:id/start       # Force start quiz
POST   /quizzes/:id/end         # Force end quiz

# Quiz Questions
POST   /quiz-questions           # Create question
GET    /quiz-questions           # List questions
GET    /quiz-questions/:id       # Get question
PUT    /quiz-questions/:id       # Update question
DELETE /quiz-questions/:id       # Delete question

# Quiz Submissions
GET    /quiz-submissions         # List submissions
GET    /quiz-submissions/:id     # Get submission
PUT    /quiz-submissions/:id     # Update submission
DELETE /quiz-submissions/:id     # Delete submission

# Assignments
POST   /assignments              # Create assignment
GET    /assignments              # List assignments
GET    /assignments/:id          # Get assignment
PUT    /assignments/:id          # Update assignment
DELETE /assignments/:id         # Delete assignment

# Resources
POST   /resources                # Create resource
GET    /resources                # List resources
GET    /resources/:id            # Get resource
PUT    /resources/:id            # Update resource
DELETE /resources/:id            # Delete resource

# Progress
GET    /progress                 # Get all progress
GET    /progress/:id             # Get progress by ID

# Live Sessions
POST   /live-sessions            # Create session
GET    /live-sessions            # List sessions
GET    /live-sessions/:id        # Get session
PUT    /live-sessions/:id       # Update session
DELETE /live-sessions/:id       # Delete session

# Contacts
POST   /contacts                 # Create contact
GET    /contacts                 # List contacts
GET    /contacts/:id             # Get contact
DELETE /contacts/:id             # Delete contact
```

---

## 🗄️ Database Schema Overview

### **Main Tables** (inferred from code)

1. **users**
   - `user_id`, `name`, `email`, `password_hash`, `role`, `status`, `created_at`, `updated_at`

2. **register**
   - `id`, `full_name`, `email_address`, `contact_number`, `level_of_archicad_skills`, `module`, `payment_amount`, `payment_status`, `payment_reference`, `payment_method`, `created_at`

3. **weeks**
   - `week_id`, `title`, `description`, `order_num`, `created_at`

4. **projects**
   - `project_id`, `week_id`, `title`, `description`, `order_num`, `created_at`

5. **lessons**
   - `lesson_id`, `project_id`, `title`, `content`, `file_url`, `video_url`, `order_num`, `created_at`

6. **quizzes**
   - `quiz_id`, `project_id`, `title`, `description`, `start_time`, `end_time`, `time_limit`, `status`, `auto_start`, `auto_submit`, `grace_period`, `created_at`

7. **quiz_questions**
   - `question_id`, `quiz_id`, `question_text`, `question_type`, `points`, `file_url`, `order_num`

8. **quiz_choices**
   - `choice_id`, `question_id`, `choice_text`, `is_correct`

9. **quiz_sessions**
   - `session_id`, `quiz_id`, `user_id`, `started_at`, `submitted_at`, `session_data`, `final_score`, `auto_submitted`, `time_remaining`

10. **quiz_submissions**
    - `submission_id`, `quiz_id`, `user_id`, `answers`, `submitted_at`, `time_taken`, `score`, `auto_submitted`

11. **assignments**
    - `assignment_id`, `project_id`, `title`, `description`, `due_date`, `question_file_url`, `created_at`

12. **assignment_submissions**
    - `submission_id`, `assignment_id`, `user_id`, `answer_file_url`, `submitted_at`, `status`, `grade`

13. **progress**
    - `progress_id`, `user_id`, `lesson_id`, `completed_at`, `status`

14. **resources**
    - `resource_id`, `title`, `description`, `file_url`, `type`, `created_at`

15. **live_sessions**
    - `session_id`, `title`, `description`, `scheduled_time`, `duration`, `meeting_link`, `status`, `created_at`

16. **contacts**
    - `contact_id`, `name`, `email`, `message`, `created_at`

---

## 🛠️ Technologies & Dependencies

### **Core**
- **Node.js** - Runtime environment
- **Express 5.x** - Web framework
- **PostgreSQL** (via `postgres` package) - Database
- **Socket.io** - WebSocket support

### **Authentication & Security**
- **jsonwebtoken** - JWT tokens
- **bcrypt/bcryptjs** - Password hashing
- **express-session** - Session management
- **cookie-parser** - Cookie handling

### **File Management**
- **multer** - File upload handling
- **cloudinary** - Image upload service
- **mime-types** - File type detection
- **uuid** - Unique file naming

### **Email Services**
- **sib-api-v3-sdk** (Brevo/Sendinblue) - Email API
- **nodemailer** - Alternative email service
- **@getbrevo/brevo** - Brevo SDK
- **resend** - Email service

### **Communication**
- **twilio** - SMS notifications
- **socket.io-client** - WebSocket client

### **Utilities**
- **dotenv** - Environment variables
- **cors** - Cross-origin requests
- **date-fns-tz** - Timezone handling
- **axios** - HTTP client

### **Development**
- **nodemon** - Auto-reload
- **jest** - Testing framework
- **supertest** - HTTP assertions

---

## 🔄 Data Flow

### **Registration Flow**
```
User Registration
    ↓
Create User (status: 'pending')
    ↓
Send Confirmation Email
    ↓
User Confirms Email (status: 'pending')
    ↓
Admin Approves (status: 'active')
    ↓
User Can Login
```

### **Quiz Flow**
```
Admin Creates Quiz
    ↓
Set Start/End Time
    ↓
Quiz Timer Service Checks (every 30s)
    ↓
Auto-start when start_time reached
    ↓
Student Joins Quiz Session
    ↓
WebSocket Connection Established
    ↓
Student Submits Answers
    ↓
Auto-submit when time expires
    ↓
Calculate Score & Save Submission
```

### **Assignment Flow**
```
Admin Creates Assignment
    ↓
Upload Question File
    ↓
Assign to Project/Week
    ↓
Student Views Assignment
    ↓
Student Downloads Question File
    ↓
Student Uploads Answer File
    ↓
Submission Saved
    ↓
Admin Reviews & Grades
```

---

## 🌐 Services & Background Tasks

### **1. Quiz Timer Service**
- Runs every 30 seconds
- Auto-starts scheduled quizzes
- Auto-ends active quizzes
- Handles expired quiz sessions
- Broadcasts WebSocket events

### **2. WebSocket Service**
- Real-time quiz session updates
- Live notifications
- Student connection management
- Session state synchronization

### **3. Email Service**
- Account confirmation emails
- Password reset emails
- Payment instruction emails
- Payment status notifications

### **4. File Upload Service**
- Handles multipart form data
- Validates file types
- Saves files to disk/cloud
- Generates unique file names

---

## 🔒 Security Features

1. **Authentication**
   - JWT token-based
   - HTTP-only cookies
   - Session management

2. **Authorization**
   - Role-based access control
   - Admin-only endpoints
   - User resource ownership checks

3. **Password Security**
   - Bcrypt hashing (10 rounds)
   - Password reset tokens (time-limited)

4. **File Security**
   - File type validation
   - Size limits
   - Secure file serving

5. **Database**
   - Parameterized queries (SQL injection prevention)
   - SSL connections

---

## 📊 Key Features Summary

✅ **User Management**: Registration, authentication, approval workflow  
✅ **Course Structure**: Weeks → Projects → Lessons hierarchy  
✅ **Quiz System**: Auto-start/end, time limits, file questions  
✅ **Assignment System**: File uploads, submission tracking  
✅ **Progress Tracking**: Lesson completion, student analytics  
✅ **Live Sessions**: Scheduled sessions, meeting links  
✅ **Real-time**: WebSocket for quiz sessions  
✅ **File Management**: Upload, download, cloud storage  
✅ **Email Integration**: Brevo/Sendinblue email service  
✅ **Admin Dashboard**: User management, content management  
✅ **Payment Tracking**: Registration payment status  
✅ **Resource Management**: Learning materials library  

---

## 🚀 Server Architecture

```
┌─────────────────────────────────────────┐
│         HTTP Server (Port 5000)         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      Express Application        │   │
│  │  • REST API Routes              │   │
│  │  • Middleware (Auth, Upload)     │   │
│  │  • Static File Serving          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     WebSocket Server (IO)       │   │
│  │  • Quiz Session Real-time        │   │
│  │  • Live Notifications           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Background Services           │   │
│  │  • Quiz Timer Service (30s)     │   │
│  │  • Email Service                │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  PostgreSQL DB  │
    └─────────────────┘
```

---

## 📝 Notes

- **Timezone**: Uses CAT (Central Africa Time - UTC+2) for quiz scheduling
- **File Storage**: Local `uploads/` directory + Cloudinary for images
- **Email Service**: Brevo (formerly Sendinblue) integration
- **Real-time**: WebSocket for quiz sessions and live updates
- **Auto-quiz Management**: Background service handles quiz lifecycle
- **Payment Integration**: Tracks registration payments
- **Multi-role Support**: Admin and Student roles with different access levels

---

**Generated**: October 2025  
**Version**: Based on current codebase structure


