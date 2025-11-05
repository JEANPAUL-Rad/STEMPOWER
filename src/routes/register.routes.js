// src/routes/register.routes.js
import { Router } from 'express';
import {
    create,
    deleteById,
    getById,
    list,
    update,
    updatePaymentStatus
} from '../controllers/register.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

router.post('/', create);
router.get('/', authenticate, requireAdmin, list); // admin only: list all registrations
router.get('/:id', getById);
router.put('/:id', authenticate, requireAdmin, update); // admin only: update registration
router.patch('/:id/payment', authenticate, requireAdmin, updatePaymentStatus); // admin only: update payment status
router.delete('/:id', authenticate, requireAdmin, deleteById); // admin only: delete registration

export default router;


