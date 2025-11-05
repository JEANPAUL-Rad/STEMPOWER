

import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as QuizQuestionController from '../../controllers/admin/quiz_question.controller.js';
import * as QuizController from '../../controllers/admin/quiz.controller.js';


const router = express.Router();

// Quiz routes
router.get('/quizzes', authenticate, requireAdmin, QuizController.getAllQuizzes);
router.get('/quizzes/:quiz_id', authenticate, requireAdmin, QuizController.getQuizById);

// File upload route
router.post('/upload-file', authenticate, requireAdmin, QuizQuestionController.uploadFile, QuizQuestionController.uploadQuestionFile);

// Question routes
router.get('/quizzes/:quiz_id/questions', authenticate, requireAdmin, QuizQuestionController.getQuestions);
router.post('/quizzes/:quiz_id/questions', authenticate, requireAdmin, QuizQuestionController.addQuestion);
router.put('/quiz-questions/:question_id', authenticate, requireAdmin, QuizQuestionController.updateQuestion);
router.delete('/quiz-questions/:question_id', authenticate, requireAdmin, QuizQuestionController.deleteQuestion);

// Choice routes
router.post('/quiz-questions/:question_id/choices', authenticate, requireAdmin, QuizQuestionController.addChoice);
router.put('/quiz-choices/:choice_id', authenticate, requireAdmin, QuizQuestionController.updateChoice);
router.delete('/quiz-choices/:choice_id', authenticate, requireAdmin, QuizQuestionController.deleteChoice);
router.get('/quiz-choices/:id', authenticate, requireAdmin, QuizQuestionController.getQuizChoiceById);

// New routes to get all questions and all choices
router.get('/quiz-questions', authenticate, requireAdmin, QuizQuestionController.getAllQuestions);
router.get('/quiz-choices', authenticate, requireAdmin, QuizQuestionController.getAllChoices);


export default router;