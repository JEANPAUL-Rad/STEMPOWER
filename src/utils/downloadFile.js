// src/utils/downloadFile.js
import cloudinary from './cloudinary.js';

/**
 * Generate a secure download URL for a file
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @param {string} originalName - Original filename for download
 * @returns {string} - Secure download URL
 */
export const generateDownloadUrl = (publicId, resourceType = 'raw', originalName = null) => {
  try {
    // For raw files (PDFs, documents), generate URL with attachment flag
    if (resourceType === 'raw') {
      const url = cloudinary.url(publicId, {
        resource_type: 'raw',
        flags: 'attachment',
        // Add original filename if provided
        ...(originalName && { 
          transformation: [{ flags: `attachment:${originalName}` }] 
        })
      });
      return url;
    }
    
    // For images, use normal URL
    if (resourceType === 'image') {
      return cloudinary.url(publicId, {
        resource_type: 'image',
        secure: true
      });
    }
    
    // For videos
    if (resourceType === 'video') {
      return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true
      });
    }
    
    // Default fallback
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true
    });
    
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} cloudinaryUrl - Full Cloudinary URL
 * @returns {string} - Public ID
 */
export const extractPublicId = (cloudinaryUrl) => {
  try {
    // Handle different URL formats
    const urlParts = cloudinaryUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL format');
    }
    
    // Get parts after 'upload/v{version}/'
    const relevantParts = urlParts.slice(uploadIndex + 2);
    
    // Join all parts except the last one (filename with extension)
    const publicIdWithExtension = relevantParts.join('/');
    
    // Remove file extension from the last part
    const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
    const publicId = lastDotIndex > 0 
      ? publicIdWithExtension.substring(0, lastDotIndex)
      : publicIdWithExtension;
    
    return publicId;
    
  } catch (error) {
    console.error('Error extracting public ID:', error);
    throw new Error('Failed to extract public ID from URL');
  }
};

/**
 * Get file info from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type
 * @returns {Object} - File information
 */
export const getFileInfo = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at
    };
    
  } catch (error) {
    console.error('Error getting file info:', error);
    throw new Error('File not found or inaccessible');
  }
};