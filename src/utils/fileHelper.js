     import fs from 'fs';
import path from 'path';

// Ensure directory exists
export const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
    return true;
  }
  return false;
};

// Find file in multiple possible locations
export const findFileInUploads = (filename) => {
  const uploadDirs = [
    'uploads/quiz-submissions',
    'uploads/quiz-files', 
    'uploads/resources',
    'uploads'
  ];

  for (const dir of uploadDirs) {
    const fullPath = path.join(process.cwd(), dir, filename);
    if (fs.existsSync(fullPath)) {
      return {
        found: true,
        path: fullPath,
        relativePath: path.join(dir, filename),
        directory: dir
      };
    }
  }

  return {
    found: false,
    searchedPaths: uploadDirs.map(dir => path.join(process.cwd(), dir, filename))
  };
};

// Get MIME type from file extension
export const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

// Initialize upload directories
export const initializeUploadDirectories = () => {
  const dirs = [
    'uploads',
    'uploads/quiz-files',
    'uploads/quiz-submissions', 
    'uploads/resources'
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    ensureDirectoryExists(fullPath);
  });

  console.log('Upload directories initialized');
};

const extFromMimeType = (mimeType = '') => {
  const t = String(mimeType || '').toLowerCase().trim();
  const map = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'application/zip': '.zip',
  };
  return map[t] || '';
};

// Build a safe download filename, preserving extension from the URL if possible.
export function buildDownloadName(fileUrl, fallbackName, mimeType) {
  try {
    const cleanUrl = fileUrl.split("?")[0];
    const urlExt = path.extname(cleanUrl); // .pdf, .docx, .pptx
    const nameExt = path.extname(String(fallbackName || ''));
    const mimeExt = extFromMimeType(mimeType);
    const ext = urlExt || nameExt || mimeExt || '.pdf';

    // Remove any extension from the base name to avoid "file.pdf.pdf"
    const baseRaw = nameExt ? path.basename(String(fallbackName || ''), nameExt) : String(fallbackName || '');
    // Keep the original name as much as possible, only removing characters that break headers / paths.
    const safeBase = baseRaw
      .replace(/[/\\]+/g, '_')
      .replace(/[\r\n\t\0]+/g, ' ')
      .trim();

    return `${safeBase || 'download'}${ext}`;
  } catch {
    return `${fallbackName}.pdf`;
  }
}