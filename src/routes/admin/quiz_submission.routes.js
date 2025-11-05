import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as quizSubmissionController from '../../controllers/admin/quiz_submission.controller.js';

const router = express.Router();

// Create a quiz submission
router.post('/quiz-submissions', authenticate, requireAdmin, quizSubmissionController.create);

// List all quiz submissions, with optional filters
router.get('/quiz-submissions', authenticate, requireAdmin, quizSubmissionController.list);

// Get a single quiz submission by ID
router.get('/quiz-submissions/:submission_id', authenticate, requireAdmin, quizSubmissionController.get);

// Update a quiz submission
router.put('/quiz-submissions/:submission_id', authenticate, requireAdmin, quizSubmissionController.update);

// Delete a quiz submission
router.delete('/quiz-submissions/:submission_id', authenticate, requireAdmin, quizSubmissionController.remove);

export default router;


