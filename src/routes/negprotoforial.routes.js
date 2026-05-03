import express from 'express';
import {
  getAll,
  getById,
  create,
  update,
  toggleActive,
  remove,
  getActiveRecords,
  getActiveById,
} from '../controllers/negprotoforial.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// ─── PUBLIC ROUTES (authenticated users / students) ───────────────────────────
//
//  GET /api/negprotoforial                          → all active records
//  GET /api/negprotoforial?category=MEP Training    → filter by category
//  GET /api/negprotoforial?type=video               → filter by type
//  GET /api/negprotoforial?category=X&type=image    → filter by both
//  GET /api/negprotoforial/:id                      → single active record
//
router.get('/', getActiveRecords);
router.get('/:id', getActiveById);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, requireAdmin, getAll);
router.get('/admin/:id', authenticate, requireAdmin, getById);
router.post('/admin', authenticate, requireAdmin, upload.single('file'), create);
router.put('/admin/:id', authenticate, requireAdmin, upload.single('file'), update);
router.patch('/admin/:id/toggle', authenticate, requireAdmin, toggleActive);
router.delete('/admin/:id', authenticate, requireAdmin, remove);

export default router;
