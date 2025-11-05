import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as projectController from '../../controllers/admin/project.controller.js';
import upload from '../../middleware/upload.js';

const router = express.Router();

// If you want to support image upload in the future, add multer middleware here
// import upload from '../../middleware/upload.js';
// router.post('/projects', authenticate, requireAdmin, upload.single('image'), projectController.createProject);
router.post('/projects', authenticate, requireAdmin,upload.single('image'), projectController.createProject);
router.get('/projects', authenticate, requireAdmin, projectController.getAllProjects);
router.get('/projects/:project_id', authenticate, requireAdmin, projectController.getProjectById);
router.put('/projects/:project_id', authenticate, requireAdmin, projectController.updateProject);
router.delete('/projects/:project_id', authenticate, requireAdmin, projectController.deleteProject);

export default router;