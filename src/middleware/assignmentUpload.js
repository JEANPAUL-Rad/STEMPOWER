// middleware/assignmentUpload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Use memory storage to be compatible with Cloudinary upload (expects file.buffer)
const assignmentStorage = multer.memoryStorage();

const submissionStorage = multer.memoryStorage();

// Common allowed types for assignments (admin/teacher uploads)
const assignmentAllowedExtensions = [
  '.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif',
  '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.zip', '.rar', '.mp4', '.mov', '.avi'
];
const assignmentAllowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/zip',
  'application/x-rar-compressed',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo'
];

// Common allowed types for submissions (students)
const submissionAllowedExtensions = [
  '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.jpg', '.jpeg', '.png', '.mp4'
];
const submissionAllowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'image/jpeg',
  'image/png',
  'video/mp4'
];

// File filter factory function
const createFileFilter = (allowedExtensions, allowedMimeTypes) => {
  return (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Check if extension is allowed
    if (!allowedExtensions.includes(extension)) {
      return cb(new Error(`File type ${extension} not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }

    // Check if mime type is allowed
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }

    cb(null, true);
  };
};

// Middleware for uploading assignment questions (admin/teacher)
export const uploadAssignment = multer({
  storage: assignmentStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for assignment files
  },
  fileFilter: createFileFilter(assignmentAllowedExtensions, assignmentAllowedMimeTypes)
}).array('files', 10);

// Middleware for uploading assignment submissions (students)
export const uploadSubmission = multer({
  storage: submissionStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: createFileFilter(submissionAllowedExtensions, submissionAllowedMimeTypes)
}).array('files', 10);

// Error handling middleware
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File validation error'
    });
  }
  next();
};

// Dynamic submission middleware that checks assignment-specific requirements
export const dynamicSubmissionMiddleware = async (req, res, next) => {
  try {
    const assignmentId = req.params.assignment_id;
    
    // You'll need to implement getAssignmentById in your model
    // For now, using basic submission middleware
    return uploadSubmission(req, res, next);
  } catch (error) {
    console.error('Error in dynamic submission middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Default export for backward compatibility
export default {
  uploadAssignment,
  uploadSubmission,
  handleUploadErrors,
  dynamicSubmissionMiddleware
};
