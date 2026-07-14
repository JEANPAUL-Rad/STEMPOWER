// src/utils/saveFile.js
import cloudinary from '../utils/cloudinary.js';

/**
 * Save file buffer to Cloudinary
 * @param {Object} file - File object with buffer, mimetype, originalname
 * @returns {Promise<Object>} - Cloudinary result with secure_url and public_id
 */
export const saveFile = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided');
  }

  const { buffer, mimetype, originalname } = file;

  // Check Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables not configured');
  }

  // Enhanced resource type detection - treat documents as 'raw' for proper download
  const resourceType = mimetype.startsWith('video') ? 'video' :
                      mimetype.startsWith('image') ? 'image' :
                      mimetype === 'application/pdf' ||
                      mimetype.includes('word') ||
                      mimetype.includes('excel') ||
                      mimetype.includes('spreadsheet') ||
                      mimetype.includes('powerpoint') ||
                      mimetype.includes('presentation') ||
                      mimetype.includes('msword') ||
                      mimetype.includes('ms-excel') ||
                      mimetype.includes('ms-powerpoint') ||
                      mimetype === 'text/plain' ||
                      mimetype === 'text/csv' ||
                      mimetype === 'application/zip' ||
                      mimetype === 'application/x-rar-compressed' ||
                      mimetype === 'application/octet-stream' ? 'raw' : 'image';

  console.log(`📤 Uploading to Cloudinary: ${originalname} (${mimetype}, ${resourceType})`);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'quiz-answers', // Default folder
        access_mode: 'public', // ✅ CRITICAL: This fixes 401 errors
        type: 'upload',
        filename: originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
        // Add flags for proper file handling
        flags: resourceType === 'raw' ? 'attachment' : undefined
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          return reject(new Error('Upload failed: ' + error.message));
        }
        console.log(`✅ Cloudinary upload successful: ${result.secure_url}`);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// Specialized functions with proper folder and access settings
export const saveAssignmentFile = async (file) => {
  return await uploadToFolder(file, 'assignments');
};

export const saveSubmissionFile = async (file) => {
  return await uploadToFolder(file, 'assignment-submissions');
};

export const saveLessonFile = async (file) => {
  return await uploadToFolder(file, 'lessons');
};

export const saveResourceFile = async (file) => {
  return await uploadToFolder(file, 'resources');
};

export const savePublicationFile = async (file) => {
  return await uploadToFolder(file, 'publications');
};

// Reusable function to upload to specific folder
const uploadToFolder = async (file, folder) => {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided');
  }

  const { buffer, mimetype, originalname } = file;

  // Enhanced resource type detection - treat documents as 'raw' for proper download
  const resourceType = mimetype.startsWith('video') ? 'video' :
                      mimetype.startsWith('image') ? 'image' :
                      mimetype === 'application/pdf' ||
                      mimetype.includes('word') ||
                      mimetype.includes('excel') ||
                      mimetype.includes('spreadsheet') ||
                      mimetype.includes('powerpoint') ||
                      mimetype.includes('presentation') ||
                      mimetype.includes('msword') ||
                      mimetype.includes('ms-excel') ||
                      mimetype.includes('ms-powerpoint') ||
                      mimetype === 'text/plain' ||
                      mimetype === 'text/csv' ||
                      mimetype === 'application/zip' ||
                      mimetype === 'application/x-rar-compressed' ||
                      mimetype === 'application/octet-stream' ? 'raw' : 'image';

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder, // e.g., 'assignments'
        access_mode: 'public', // ✅ CRITICAL: This fixes 401 errors
        type: 'upload',
        filename: originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
        // Add proper flags for file handling
        flags: resourceType === 'raw' ? 'attachment' : undefined
      },
      (error, result) => {
        if (error) {
          console.error(`❌ Upload to ${folder} failed:`, error);
          return reject(new Error(`Upload to ${folder} failed: ${error.message}`));
        }
        console.log(`✅ Upload to ${folder} successful: ${result.secure_url}`);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};