import path from 'path';
import fs from 'fs';
import { saveFile, saveResourceFile, saveLessonFile } from '../../utils/saveFile.js';

// Generic file upload handler
export const handleFileUpload = (uploadType = 'quiz-submissions') => {
  return async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const file = req.file;
      // Upload to Cloudinary instead of saving locally
      const cloudUrl = await saveFile(file);

      console.log('File uploaded to Cloudinary successfully:');
      console.log('- Original name:', file.originalname);
      console.log('- Cloud URL:', cloudUrl);
      console.log('- Size:', file.size, 'bytes');

      res.json({
        message: 'File uploaded successfully',
        file: {
          originalName: file.originalname,
          url: cloudUrl,
          size: file.size,
          mimetype: file.mimetype
        }
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'File upload failed', error: error.message });
    }
  };
};

// Admin quiz file upload
export const uploadAdminQuizFile = handleFileUpload('quiz-files');

// Student submission file upload
export const uploadStudentSubmission = handleFileUpload('quiz-submissions');

// Lesson file upload
export const uploadLessonFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    // Upload to Cloudinary using the lessons folder
    const cloudUrl = await saveLessonFile(file);

    console.log('Lesson file uploaded to Cloudinary successfully:');
    console.log('- Original name:', file.originalname);
    console.log('- Cloud URL:', cloudUrl);
    console.log('- Size:', file.size, 'bytes');

    res.json({
      message: 'Lesson file uploaded successfully',
      file: {
        originalName: file.originalname,
        url: cloudUrl,
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    console.error('Lesson file upload error:', error);
    res.status(500).json({ message: 'Lesson file upload failed', error: error.message });
  }
};

// Resource file upload
export const uploadResourceFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    // Upload to Cloudinary using the resources folder
    const cloudUrl = await saveResourceFile(file);

    console.log('Resource file uploaded to Cloudinary successfully:');
    console.log('- Original name:', file.originalname);
    console.log('- Cloud URL:', cloudUrl);
    console.log('- Size:', file.size, 'bytes');

    res.json({
      message: 'Resource file uploaded successfully',
      file: {
        originalName: file.originalname,
        url: cloudUrl,
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    console.error('Resource file upload error:', error);
    res.status(500).json({ message: 'Resource file upload failed', error: error.message });
  }
};

// File download handler
export const downloadFile = async (req, res) => {
  try {
    // With Cloudinary, clients should use the stored URL directly.
    // Keep this endpoint for backward compatibility, but instruct clients to use the URL.
    return res.status(410).json({ message: 'This endpoint is deprecated. Use the file URL returned at upload time.' });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed', error: error.message });
  }
};