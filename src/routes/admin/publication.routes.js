
import express from 'express';
import * as publicationController from '../../controllers/admin/publication.controller.js';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import upload from '../../middleware/upload.js';

// Admin router (under /api/v1/admin)
const adminRouter = express.Router();
// Public router (under /api/publications)
const publicRouter = express.Router();

// POST /publications - Create new publication with file upload
adminRouter.post('/publications', 
  authenticate, 
  requireAdmin, 
  upload.any(), 
  publicationController.create
);

// GET /publications - List all publications (admin only)
adminRouter.get('/publications', authenticate, requireAdmin, publicationController.list);

// GET /published - Get published publications (public)
publicRouter.get('/published', publicationController.listPublished);

// GET /publications/:publication_id - Get single publication (admin only)
adminRouter.get('/publications/:publication_id', authenticate, requireAdmin, publicationController.get);

// PUT /publications/:publication_id - Update publication with file upload
adminRouter.put('/publications/:publication_id', 
  authenticate, 
  requireAdmin, 
  upload.any(), 
  publicationController.update
);

// DELETE /publications/:publication_id/files/:file_id - Delete a file from publication
adminRouter.delete('/publications/:publication_id/files/:file_id', 
  authenticate, 
  requireAdmin, 
  publicationController.deleteFile
);

// DELETE /publications/:publication_id - Delete publication
adminRouter.delete('/publications/:publication_id', authenticate, requireAdmin, publicationController.remove);

export { adminRouter, publicRouter };

