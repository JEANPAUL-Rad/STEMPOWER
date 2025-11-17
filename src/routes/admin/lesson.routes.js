import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as lessonController from '../../controllers/admin/lesson.controller.js';
import * as fileController from '../../controllers/admin/file.controller.js'; // New import
import upload from '../../middleware/upload.js';

const router = express.Router();

// Lesson routes
router.post('/lessons', authenticate, requireAdmin, upload.any(), lessonController.createLesson);
router.get('/lessons', authenticate, requireAdmin, lessonController.getAllLessons);
router.get('/lessons/:lesson_id', authenticate, requireAdmin, lessonController.getLessonById);
router.put('/lessons/:lesson_id', authenticate, requireAdmin, upload.any(), lessonController.updateLesson);
router.delete('/lessons/:lesson_id', authenticate, requireAdmin, lessonController.deleteLesson);

// File upload routes
router.post('/upload-file', authenticate, requireAdmin, upload.single('file'), fileController.uploadFile);
router.get('/uploads/:filename', authenticate, fileController.getFile);

export default router;