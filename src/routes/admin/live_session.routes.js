import express from 'express';
import {
  getAllLiveSessions,
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
} from '../../controllers/admin/live_session.controller.js';

const router = express.Router();

router.get('/live-sessions', getAllLiveSessions);
router.post('/live-sessions', createLiveSession);
router.put('/live-sessions/:live_id', updateLiveSession);
router.delete('/live-sessions/:live_id', deleteLiveSession);

export default router;
