import path from 'path';
import fs from 'fs';
import { saveFile } from '../../utils/saveFile.js';

export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // With memory storage, upload to Cloudinary and return its URL
    const cloudUrl = await saveFile(req.file);
    res.status(200).json({
      message: "File uploaded successfully",
      file_url: cloudUrl,
      original_name: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getFile(req, res) {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Send the file
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}