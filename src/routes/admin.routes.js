import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
    approveStudent,
    blockStudent,
    unblockStudent,
    listUsersByStatus,
    getSingleUser,
    updateUserProfile,
    deleteUserById,
    listUsers
} from '../controllers/admin.controller.js';

const router = express.Router();

// All routes below require the user to be authenticated and an admin!
router.patch('/users/:user_id/approve', authenticate, requireAdmin, approveStudent);
router.patch('/users/:user_id/block', authenticate, requireAdmin, blockStudent);
router.patch('/users/:user_id/unblock', authenticate, requireAdmin, unblockStudent);
router.get('/users', authenticate, requireAdmin, listUsers);
router.get('/user/:id', getSingleUser);
router.get('/user', getSingleUser); // for email query
router.put('/user/:id', updateUserProfile);
router.delete('/user/:id', deleteUserById);
// router.get('/users', listUsers);

export default router;