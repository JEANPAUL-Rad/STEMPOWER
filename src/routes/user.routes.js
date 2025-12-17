import express from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.get('/confirm/:token', userController.confirm);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes
router.post('/logout', authenticate, userController.logout);
router.get('/check-session', userController.checkSession);
router.get('/payment/status', authenticate, userController.getPaymentStatus);
router.post('/diagnostics/email', authenticate, requireAdmin, userController.diagnoseEmail);

export default router;
