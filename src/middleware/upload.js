// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// // Create uploads folder if it doesn't exist
// const uploadDir = './uploads';
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir); // store in /uploads
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname); // e.g., .jpg
//     const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
//     cb(null, filename);
//   }
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 1024 * 1024 * 10 }, // 5MB
  
//  });

// export default upload;


import multer from 'multer';
import path from 'path';

// Use memory storage to keep file in buffer
const storage = multer.memoryStorage(); // ← Changed: store in memory, not disk

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      // PDF
      'application/pdf',
      // Word
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Excel
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // PowerPoint
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'text/plain', 'text/csv', 'application/csv',
      // Archives
      'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 'application/x-rar-compressed',
      // Video (common)
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      // Misc RAW/CAD often treated as octet-stream
      'application/octet-stream'
    ]);
    if (allowed.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

export default upload;
