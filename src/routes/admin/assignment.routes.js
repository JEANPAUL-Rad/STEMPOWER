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
router.get('/assignments/:assignment_id', assignmentController.getAssignmentById);
router.post('/assignments', uploadAssignment, assignmentController.createAssignment);
router.put('/assignments/:assignment_id', assignmentController.updateAssignment);
router.delete('/assignments/:assignment_id', assignmentController.deleteAssignment);

// Assignment submissions management
router.get('/assignments/:assignment_id/submissions', assignmentController.getAssignmentSubmissions);
// ADD THIS ROUTE FOR DOWNLOAD
router.get('/submissions/:submission_id/download', assignmentController.downloadSubmissionFile);
router.post('/submissions/:submission_id/grade', assignmentController.gradeSubmission);
router.get('/assignments/:assignment_id/download', assignmentController.downloadAssignmentFile);





// Add this route  edit submission
router.put('/submissions/:submission_id', uploadSubmission, assignmentController.editSubmission);
export default router;