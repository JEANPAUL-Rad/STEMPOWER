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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDF, and MP4 allowed.'));
    }
  }
});

export default upload;
