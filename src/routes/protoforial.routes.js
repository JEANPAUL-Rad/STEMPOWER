import express from 'express';
import * as controller from '../controllers/protoforial.controller.js';
import upload from '../middleware/upload.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public endpoints
router.post('/protoforial/register', controller.register);
router.post('/protoforial/register-with-file', upload.single('support_document'), controller.registerWithFile);
router.post('/protoforial/login', controller.login);
router.get('/protoforial/me', controller.me);
router.get('/protoforial/public', controller.getPublicProtoforial);

// Profile management
router.put('/protoforial/:proto_id', controller.update);
router.delete('/protoforial/:proto_id', controller.remove);
// Multi-file upload and document operations
router.post('/protoforial/:proto_id/support-document', upload.array('documents', 10), controller.uploadSupportDocument);
router.get('/protoforial/:proto_id/documents', controller.listDocuments);
router.get('/protoforial/document/:document_id/download', controller.downloadDocument);

// Admin: update payment status
router.patch('/protoforial/:proto_id/payment', authenticate, requireAdmin, controller.adminSetPaymentStatus);

// Admin: get all protoforial entries
router.get('/admin/protoforial', authenticate, requireAdmin, controller.getAllProtoforial);

export default router;


