// src/routes/admin/contact.routes.js
import express from 'express';
import {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactMessage,
  deleteContactMessage
} from '../../controllers/admin/contact.controller.js';

const router = express.Router();

// Create a new contact message
router.post('/', createContactMessage);

// Get all contact messages
router.get('/', getAllContactMessages);

// Get a specific contact message by ID
router.get('/:id', getContactMessageById);

// Update a contact message
router.put('/:id', updateContactMessage);

// Delete a contact message
router.delete('/:id', deleteContactMessage);

export default router;