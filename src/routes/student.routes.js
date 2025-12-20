// Complete student.routes.js
import express from 'express';
import * as studentController from '../controllers/student.controller.js';
import { handleUploadErrors, uploadSubmission } from '../middleware/assignmentUpload.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { mapFilesToAnswers } from '../middleware/mapFilesToAnswers.js';
import upload from '../middleware/upload.js';

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
// Direct file access for assignment question
router.get('/assignments/:assignment_id/file', studentController.downloadAssignmentFile);

// Assignment submission route with proper error handling
router.post(
  '/assignments/:assignment_id/submit',
  uploadSubmission,
  handleUploadErrors,
  studentController.submitAssignment
);

// Update your student.routes.js to use the controller method
// router.get('/download/submission/:submission_id', studentController.downloadSubmission);

// Generic proxy download for allowed remote/local files (e.g., Cloudinary PDFs)
router.get('/download', studentController.proxyDownload);
// Add this route for direct lesson file download
router.get('/lessons/:lesson_id/download', studentController.downloadLessonFile);

// Download submission route
router.get('/download/submission/:submission_id', studentController.downloadSubmission);

router.get('/my-submissions', studentController.getMySubmissions);

// Get submission details with files
router.get('/submissions/:submission_id', studentController.getSubmissionDetails);

// Edit own submission (add/remove files) before due date
router.put('/submissions/:submission_id', uploadSubmission, handleUploadErrors, studentController.editMySubmission);
// Remove a specific file from own submission
router.delete('/submissions/files/:file_id', studentController.removeMySubmissionFile);
// Delete entire submission (owner only, typically before due date)
router.delete('/submissions/:submission_id', studentController.deleteMySubmission);

export default router;