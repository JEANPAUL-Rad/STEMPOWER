import express from 'express';
import * as ProgressController from '../../controllers/admin/progress.controller.js';

const router = express.Router();

router.post('/progress', ProgressController.create);
router.get('/progress', ProgressController.list);
router.get('/progress/:progress_id', ProgressController.get);
router.put('/progress/:progress_id', ProgressController.update);
router.delete('/progress/:progress_id', ProgressController.remove);

export default router;