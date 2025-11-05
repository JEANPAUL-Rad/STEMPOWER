import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as quizController from '../../controllers/admin/quiz.controller.js';

const router = express.Router();

router.post('/quizzes', authenticate, requireAdmin, quizController.createQuiz);
router.get('/quizzes', authenticate, requireAdmin, quizController.getAllQuizzes);
router.get('/quizzes/:quiz_id', authenticate, requireAdmin, quizController.getQuizById);
router.put('/quizzes/:quiz_id', authenticate, requireAdmin, quizController.updateQuiz);
router.delete('/quizzes/:quiz_id', authenticate, requireAdmin, quizController.deleteQuiz);

// NEW: Quiz control routes
router.post('/quizzes/:quiz_id/start-now', authenticate, requireAdmin, quizController.startQuizNow);
router.post('/quizzes/:quiz_id/end-now', authenticate, requireAdmin, quizController.endQuizNow);
router.post('/quizzes/:quiz_id/pause', authenticate, requireAdmin, quizController.pauseQuiz);
router.post('/quizzes/:quiz_id/resume', authenticate, requireAdmin, quizController.resumeQuiz);

// NEW: Live monitoring routes
router.get('/quizzes/:quiz_id/live-stats', authenticate, requireAdmin, quizController.getQuizLiveStats);


export default router;