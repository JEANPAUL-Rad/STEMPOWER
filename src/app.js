// src/app.js

import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import { streamOrRedirect } from './utils/fileDelivery.js';

// Load environment variables
dotenv.config();

const app = express();

const brevoConfigured = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
const emailMethod = brevoConfigured ? 'Brevo' : (smtpConfigured ? 'SMTP' : 'none');
console.log('Email method:', emailMethod);

app.use(cookieParser());
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ['text/plain', 'text/*'] }));
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Resolve current directory
const __dirname = path.resolve();

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/quiz-files', express.static(path.join(__dirname, 'uploads/quiz-files')));
app.use('/uploads/quiz-submissions', express.static(path.join(__dirname, 'uploads/quiz-submissions')));
app.use('/uploads/assignments', express.static(path.join(__dirname, 'uploads/assignments')));
app.use('/uploads/assignment-submissions', express.static(path.join(__dirname, 'uploads/assignment-submissions')));

// Import routes
import * as AssignmentModel from './models/admin/assignment.model.js';
import * as AssignmentFileModel from './models/admin/assignment_file.model.js';
import * as QuizQuestionModel from './models/admin/quiz_question.model.js';
import * as StudentModel from './models/student.model.js';
import adminRoutes from './routes/admin.routes.js';
import adminAssignmentRoutes from './routes/admin/assignment.routes.js';
import contactRoutes from './routes/admin/contact.routes.js';
import adminLessonRoutes from './routes/admin/lesson.routes.js';
import adminLiveSessionRoutes from './routes/admin/live_session.routes.js';
import adminProgressRoutes from './routes/admin/progress.routes.js';
import adminProjectRoutes from './routes/admin/project.routes.js';
import adminQuizRoutes from './routes/admin/quiz.routes.js';
import adminQuizQuestionRoutes from './routes/admin/quiz_question.routes.js';
import adminQuizSubmissionRoutes from './routes/admin/quiz_submission.routes.js';
import adminResourceRoutes from './routes/admin/resource.routes.js';
import submissionAnswerRoutes from './routes/admin/submission_answer.routes.js';
import adminWeekRoutes from './routes/admin/week.routes.js';
import protoforialRoutes from './routes/protoforial.routes.js';
import registerRoutes from './routes/register.routes.js';
import studentRoutes from './routes/student.routes.js';
import userRoutes from './routes/user.routes.js';

// Download routes
app.get('/api/download/question-file/:quizId/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await QuizQuestionModel.getQuestionById(questionId);

    if (!question || !question.file_url) {
      return res.status(404).json({ message: 'File not found for this question.' });
    }

    const filePath = path.join(__dirname, 'uploads', question.file_url);
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(question.file_url);
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          if (err.code === 'ENOENT') {
            return res.status(404).json({ message: 'File not found on server.' });
          }
          res.status(500).json({ message: 'Error downloading file.' });
        }
      });
    } else {
      res.status(404).json({ message: 'File not found on server.' });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error during download.' });
  }
});

app.get('/api/download/assignment/:assignment_id', async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await AssignmentModel.getAssignmentById(assignment_id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    let fileUrl = assignment.question_file_url;
    let fileName = assignment.question_file_name;

    // Fallback to new multi-file system if legacy question_file_url is missing
    if (!fileUrl) {
      const files = await AssignmentFileModel.getFilesByAssignment(assignment_id);
      if (files && files.length > 0) {
        fileUrl = files[0].file_url;
        fileName = files[0].file_name || fileName;
      }
    }

    if (!fileUrl) {
      return res.status(404).json({ message: 'Assignment file not found.' });
    }

    return streamOrRedirect(
      res,
      fileUrl,
      fileName || path.basename(fileUrl),
      'Assignment file not found on server.'
    );
  } catch (error) {
    console.error('Assignment download error:', error);
    res.status(500).json({ message: 'Internal server error during download.' });
  }
});

app.get('/api/download/submission/:submission_id', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const submission = await StudentModel.getSubmissionById(submission_id);

    if (!submission || !submission.answer_file_url) {
      return res.status(404).json({ message: 'Submission file not found.' });
    }

    return streamOrRedirect(
      res,
      submission.answer_file_url,
      submission.answer_file_name || path.basename(submission.answer_file_url),
      'Submission file not found on server.'
    );
  } catch (error) {
    console.error('Submission download error:', error);
    res.status(500).json({ message: 'Internal server error during download.' });
  }
});

// Public generic proxy download for allowed remote/local files (e.g., Cloudinary PDFs)
app.get('/api/download', async (req, res) => {
  try {
    const { url, name, disposition } = req.query;
    if (!url) return res.status(400).json({ message: 'url query is required' });
    const decoded = decodeURIComponent(url);
    // Allow only Cloudinary or local uploads
    try {
      const u = new URL(decoded, 'http://dummy.base');
      const host = u.host;
      const isCloudinary = /(^|\.)res\.cloudinary\.com$/i.test(host);
      const isUploads = decoded.startsWith('/uploads/') || decoded.includes('/uploads/');
      if (!isCloudinary && !isUploads) {
        return res.status(400).json({ message: 'URL not allowed' });
      }
    } catch {
      // If relative path (e.g., /uploads/...), allow
      if (!(decoded.startsWith('/uploads/'))) {
        return res.status(400).json({ message: 'Invalid url' });
      }
    }
    const forceAttachment = disposition === 'attachment';
    const forceInline = disposition === 'inline';
    return streamOrRedirect(res, decoded, name || undefined, 'File not found', { forceAttachment, forceInline });
  } catch (error) {
    console.error('Public proxy download error:', error);
    res.status(500).json({ message: 'Internal server error during download.' });
  }
});

// Mount routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/register', registerRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1', protoforialRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin', adminWeekRoutes);
app.use('/api/v1/admin', adminProjectRoutes);
app.use('/api/v1/admin', adminLessonRoutes);
app.use('/api/v1/admin', adminQuizRoutes);
app.use('/api/v1/admin', adminQuizQuestionRoutes);
app.use('/api/v1/admin', adminProgressRoutes);
app.use('/api/v1/admin', adminQuizSubmissionRoutes);
app.use('/api/v1/admin', adminResourceRoutes);
app.use('/api/v1/admin', submissionAnswerRoutes);
app.use('/api/v1/admin', adminLiveSessionRoutes);
app.use('/api/v1/admin/contacts', contactRoutes);
// Public contacts endpoint (same controller) to ensure availability outside admin namespace
app.use('/api/contacts', contactRoutes);
app.use('/api/v1/admin', adminAssignmentRoutes);

// Fallback route
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ONLY export the Express app - do NOT start the server here
export default app;
