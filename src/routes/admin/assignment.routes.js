import express from 'express';
import * as assignmentController from '../../controllers/admin/assignment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { uploadAssignment } from '../../middleware/assignmentUpload.js';

// Add this import at the top edit submission
import { uploadSubmission } from '../../middleware/assignmentUpload.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticate);

// Assignment management routes
router.get('/assignments', assignmentController.getAllAssignments);
router.get('/assignments/week/:week_id', assignmentController.getAssignmentsByWeek);
router.get('/assignments/:assignment_id', assignmentController.getAssignmentById);
router.post('/assignments', uploadAssignment, assignmentController.createAssignment);
router.put('/assignments/:assignment_id', uploadAssignment, assignmentController.updateAssignment);
router.delete('/assignments/:assignment_id', assignmentController.deleteAssignment);

// Lightweight JSON-only due date update (no file upload middleware)
router.patch('/assignments/:assignment_id/due-date', assignmentController.updateAssignmentDueDate);

// Assignment submissions management
router.get('/assignments/:assignment_id/submissions', assignmentController.getAssignmentSubmissions);
// ADD THIS ROUTE FOR DOWNLOAD
router.get('/submissions/:submission_id/download', assignmentController.downloadSubmissionFile);
router.post('/submissions/:submission_id/grade', assignmentController.gradeSubmission);
router.get('/assignments/:assignment_id/download', assignmentController.downloadAssignmentFile);

// Download all files for a submission as a zip
router.get('/submissions/:submission_id/download-all', assignmentController.downloadAllSubmissionFiles);

// Add this route  edit submission
router.put('/submissions/:submission_id', uploadSubmission, assignmentController.editSubmission);
// Delete submission
router.delete('/submissions/:submission_id', assignmentController.removeSubmission);
// Delete an individual submission file
router.delete('/submissions/files/:file_id', assignmentController.removeSubmissionFile);
export default router;