// src/services/fileUploadService.js
import cloudinary from '../utils/cloudinary.js';

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer
 * @param {string} folder
 * @param {string} resourceType - 'image', 'video', 'raw' (for PDF)
 * @returns {Promise<string>} - Secure URL
 */
const uploadToCloudinary = async (fileBuffer, folder = 'elearning', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder,
      },
      (error, result) => {
        if (error) return reject(new Error('Upload failed: ' + error.message));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export default uploadToCloudinary;