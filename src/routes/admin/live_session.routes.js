import express from 'express';
import {
  getAllLiveSessions,
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
} from '../../controllers/admin/live_session.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = express.Router();

router.get('/live-sessions', authenticate, requireAdmin, getAllLiveSessions);
router.post('/live-sessions', authenticate, requireAdmin, createLiveSession);
router.put('/live-sessions/:live_id', authenticate, requireAdmin, updateLiveSession);
router.delete('/live-sessions/:live_id', authenticate, requireAdmin, deleteLiveSession);

export default router;
