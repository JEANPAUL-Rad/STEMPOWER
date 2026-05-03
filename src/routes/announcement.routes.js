import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncements,
} from '../controllers/announcement.controller.js';

const router = express.Router();

// Public route (homepage marquee uses this)
router.get('/active', getActiveAnnouncements);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, getAllAnnouncements);
router.get('/:id', authenticate, requireAdmin, getAnnouncementById);
router.post('/', authenticate, requireAdmin, createAnnouncement);
router.put('/:id', authenticate, requireAdmin, updateAnnouncement);
router.patch('/:id/toggle', authenticate, requireAdmin, toggleAnnouncement);
router.delete('/:id', authenticate, requireAdmin, deleteAnnouncement);

export default router;
