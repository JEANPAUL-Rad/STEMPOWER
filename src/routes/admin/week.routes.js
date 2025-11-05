import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import * as weekController from '../../controllers/admin/week.controller.js';

const router = express.Router();

router.post('/weeks', authenticate, requireAdmin, weekController.createWeek);
router.get('/weeks', authenticate, requireAdmin, weekController.getAllWeeks);
router.get('/weeks/:week_id', authenticate, requireAdmin, weekController.getWeekById);
router.put('/weeks/:week_id', authenticate, requireAdmin, weekController.updateWeek);
router.delete('/weeks/:week_id', authenticate, requireAdmin, weekController.deleteWeek);

export default router;