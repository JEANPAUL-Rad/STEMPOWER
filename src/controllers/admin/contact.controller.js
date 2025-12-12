// src/controllers/admin/contact.controller.js
import * as ContactModel from '../../models/admin/contact.model.js';

export const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !service || !message || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (name, email, phone, service, message) are required' 
      });
    }
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be exactly 10 digits'
      });
    }
    
    const newMessage = await ContactModel.createContactMessage({ 
      name, 
      email, 
      phone: digits, 
      service, 
      message 
    });
    
    if (!newMessage) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create message' 
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully', 
      data: newMessage 
    });
  } catch (err) {
    console.error('Error creating contact message:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error occurred while creating message' 
    });
  }
};

export const getAllContactMessages = async (req, res) => {
  try {
    const messages = await ContactModel.getAllContactMessages();
    res.json({ 
      success: true, 
      data: messages,
      count: messages.length 
    });
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error occurred while fetching messages' 
    });
  }
};

export const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid message ID is required' 
      });
    }
    
    const message = await ContactModel.getContactMessageById(parseInt(id));
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: message 
    });
  } catch (err) {
    console.error('Error fetching contact message by ID:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error occurred while fetching message' 
    });
  }
};

export const updateContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, service, message } = req.body;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid message ID is required' 
      });
    }
    
    // Validate required fields
    if (!name || !email || !service || !message || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (name, email, phone, service, message) are required' 
      });
    }
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be exactly 10 digits'
      });
    }
    
    const updated = await ContactModel.updateContactMessage(parseInt(id), {
      name,
      email,
      phone: digits,
      service,
      message
    });
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: 'Message not found or could not be updated' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Message updated successfully', 
      data: updated 
    });
  } catch (err) {
    console.error('Error updating contact message:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error occurred while updating message' 
    });
  }
};

export const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid message ID is required' 
      });
    }
    
    const deleted = await ContactModel.deleteContactMessage(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Message deleted successfully', 
      data: deleted 
    });
  } catch (err) {
    console.error('Error deleting contact message:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error occurred while deleting message' 
    });
  }
};
