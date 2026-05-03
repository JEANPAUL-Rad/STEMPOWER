import express from 'express';
import upload from '../middleware/upload.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import {
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  toggleAdvertisement,
  deleteAdvertisement,
  getActiveAdvertisements,
  getAdvertisementsByType,
} from '../controllers/advertisement.controller.js';

const router = express.Router();

// Public routes for homepage and landing widgets
router.get('/active', getActiveAdvertisements);
router.get('/type/:type', getAdvertisementsByType);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, getAllAdvertisements);
router.get('/:id', authenticate, requireAdmin, getAdvertisementById);
router.post('/', authenticate, requireAdmin, upload.single('media'), createAdvertisement);
router.put('/:id', authenticate, requireAdmin, upload.single('media'), updateAdvertisement);
router.patch('/:id/toggle', authenticate, requireAdmin, toggleAdvertisement);
router.delete('/:id', authenticate, requireAdmin, deleteAdvertisement);

export default router;
