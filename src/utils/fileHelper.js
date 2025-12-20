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


function buildDownloadName(fileUrl, fallbackName) {
  try {
    const cleanUrl = fileUrl.split("?")[0];
    const ext = path.extname(cleanUrl); // .pdf, .docx, .pptx
    const safeName = fallbackName
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");

    return ext ? `${safeName}${ext}` : `${safeName}.pdf`;
  } catch {
    return `${fallbackName}.pdf`;
  }
}