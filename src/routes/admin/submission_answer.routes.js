// src/routes/admin/submission_answer.routes.js
import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as submissionAnswerController from '../../controllers/admin/submission_answer.controller.js';

const router = express.Router();

// CRUD Routes
router.post('/submission-answers', authenticate, requireAdmin, submissionAnswerController.create);
router.get('/submission-answers', authenticate, requireAdmin, submissionAnswerController.list);
router.get('/submission-answers/:answer_id', authenticate, requireAdmin, submissionAnswerController.get);
router.put('/submission-answers/:answer_id', authenticate, requireAdmin, submissionAnswerController.update);
router.delete('/submission-answers/:answer_id', authenticate, requireAdmin, submissionAnswerController.remove);

export default router;

