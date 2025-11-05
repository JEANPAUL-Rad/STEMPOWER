// Complete student.routes.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import * as studentController from '../controllers/student.controller.js';
import { handleUploadErrors, uploadSubmission } from '../middleware/assignmentUpload.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { mapFilesToAnswers } from '../middleware/mapFilesToAnswers.js';
import upload from '../middleware/upload.js';
import * as Student from '../models/student.model.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// 1. Weeks & Projects Routes
router.get('/weeks', studentController.getWeeks);
router.get('/weeks/:week_id/projects', studentController.getProjectsByWeek);

// 2. Projects & Lessons Routes
router.get('/projects', studentController.getAllProjects);
router.get('/projects/:project_id', studentController.getProjectDetails);
router.get('/projects/:project_id/lessons', studentController.getLessonsByProject);

// 3. Lessons Routes
router.get('/lessons/:lesson_id', studentController.getLessonDetails);
router.post('/lessons/:lesson_id/complete', studentController.markLessonComplete);

// 4. Quiz Routes
router.get('/quiz-history', studentController.getQuizHistory);
router.get('/project-quizzes', studentController.getAllProjectQuizzes);
router.get('/quizzes/:quiz_id', studentController.getQuizDetails);
router.post(
    '/quizzes/:quiz_id/submit',
    upload.any(),
    mapFilesToAnswers,
    studentController.submitQuiz
);

// 5. Progress Routes
router.get('/progress', studentController.getProgress);

// 6. Resources Routes
router.get('/resources', studentController.getResources);
router.get('/resources/:resource_id', studentController.getResourceDetails);

// 7. Dashboard Routes
router.get('/dashboard', studentController.getMyDashboard);
router.get('/dashboard/courses', studentController.getCourses);
router.get('/dashboard/projects-by-week', studentController.getProjectsByWeekDashboard);
router.get('/dashboard/recent-activity', studentController.getRecentActivity);
router.get('/dashboard/module-content', studentController.getAllModuleContent);
router.get('/dashboard/module-integrity', studentController.getModuleContentIntegrity);

// 8. User Routes
router.get('/user-details', studentController.getUserDetails);
router.post('/change-password', studentController.changePassword);
router.delete('/delete-account', studentController.deleteAccount);
router.put('/update-profile', studentController.updateProfile);

// 9. Live Sessions Routes
router.get('/live-sessions', studentController.getAllLiveSessions);

// 10. Assignment Routes
router.get('/assignments', studentController.getStudentAssignments);
router.get('/assignments/:assignment_id', studentController.getAssignmentById);
router.post('/assignments/:assignment_id/download', studentController.downloadAssignment);

// Assignment submission route with proper error handling
router.post(
  '/assignments/:assignment_id/submit',
  uploadSubmission,
  handleUploadErrors,
  studentController.submitAssignment
);

// Update your student.routes.js to use the controller method
// router.get('/download/submission/:submission_id', studentController.downloadSubmission);
// Add this route for direct lesson file download
router.get('/lessons/:lesson_id/download', studentController.downloadLessonFile);
// Download submission route
router.get('/download/submission/:submission_id', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submission_id);
    const userId = req.user.user_id;
    
    console.log('Download request:', { submissionId, userId });

    if (isNaN(submissionId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid submission ID' 
      });
    }

    const submission = await Student.getSubmissionById(submissionId);
    console.log('Submission found:', submission);

    if (!submission) {
      return res.status(404).json({ 
        success: false,
        message: 'Submission not found' 
      });
    }

    // Check if user owns this submission or is admin/teacher
    if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Construct file path - handle both absolute and relative paths
    let filePath;
    if (path.isAbsolute(submission.answer_file_url)) {
      filePath = submission.answer_file_url;
    } else {
      filePath = path.join(process.cwd(), submission.answer_file_url);
    }

    console.log('File path:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found at:', filePath);
      return res.status(404).json({ 
        success: false,
        message: 'File not found on server' 
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    console.log('File stats:', { size: stats.size, path: filePath });

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${submission.answer_file_name}"`);
    res.setHeader('Content-Length', stats.size);

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'Error reading file' 
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Download submission error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Internal server error during download',
        error: error.message 
      });
    }
  }
});

router.get('/my-submissions', studentController.getMySubmissions);

export default router;