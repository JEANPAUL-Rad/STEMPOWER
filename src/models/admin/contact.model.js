// src/models/admin/contact.model.js
import sql from '../../config/db.js';
import { createDBTimestamp, parseDBTimestamp } from '../../config/db.js';

export const createContactMessage = async ({ name, email, service, message }) => {
  try {
    const result = await sql`
      INSERT INTO contact_messages (name, email, service, message, created_at) 
      VALUES (${name}, ${email}, ${service}, ${message}, ${createDBTimestamp()}) 
      RETURNING *
    `;
    
    if (result.length > 0) {
      return {
        ...result[0],
        created_at_cat: parseDBTimestamp(result[0].created_at)
      };
    }
    return null;
  } catch (error) {
    console.error('Error creating contact message:', error);
    throw error;
  }
};

export const getAllContactMessages = async () => {
  try {
    const result = await sql`
      SELECT * FROM contact_messages 
      ORDER BY created_at DESC
    `;
    
    return result.map(message => ({
      ...message,
      created_at_cat: parseDBTimestamp(message.created_at)
    }));
  } catch (error) {
    console.error('Error fetching all contact messages:', error);
    throw error;
  }
};

export const getContactMessageById = async (id) => {
  try {
    const result = await sql`
      SELECT * FROM contact_messages 
      WHERE id = ${id}
    `;
    
    if (result.length > 0) {
      return {
        ...result[0],
        created_at_cat: parseDBTimestamp(result[0].created_at)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching contact message by ID:', error);
    throw error;
  }
};

export const updateContactMessage = async (id, { name, email, service, message }) => {
  try {
    const result = await sql`
      UPDATE contact_messages 
      SET name = ${name}, 
          email = ${email}, 
          service = ${service}, 
          message = ${message},
          updated_at = ${createDBTimestamp()}
      WHERE id = ${id} 
      RETURNING *
    `;
    
    if (result.length > 0) {
      return {
        ...result[0],
        created_at_cat: parseDBTimestamp(result[0].created_at),
        updated_at_cat: result[0].updated_at ? parseDBTimestamp(result[0].updated_at) : null
      };
    }
    return null;
  } catch (error) {
    console.error('Error updating contact message:', error);
    throw error;
  }
};

export const deleteContactMessage = async (id) => {
  try {
    const result = await sql`
      DELETE FROM contact_messages 
      WHERE id = ${id} 
      RETURNING *
    `;
    
    if (result.length > 0) {
      return {
        ...result[0],
        created_at_cat: parseDBTimestamp(result[0].created_at)
      };
    }
    return null;
  } catch (error) {
    console.error('Error deleting contact message:', error);
    throw error;
  }
};