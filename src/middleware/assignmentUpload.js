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

// Storage configuration for assignment questions (used by admin/teacher)
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'assignments');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `assignment-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for submissions (used by students)
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'assignment-submissions');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `submission-${req.params.assignment_id}-${uniqueSuffix}${ext}`);
  }
});

// Common allowed types for assignments (admin/teacher uploads)
const assignmentAllowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
const assignmentAllowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Common allowed types for submissions (students)
const submissionAllowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'];
const submissionAllowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed'
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
}).single('questionFile');

// Middleware for uploading assignment submissions (students)
export const uploadSubmission = multer({
  storage: submissionStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: createFileFilter(submissionAllowedExtensions, submissionAllowedMimeTypes)
}).single('file');

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
