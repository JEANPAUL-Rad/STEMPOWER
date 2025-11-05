
import * as ResourceModel from '../../models/admin/resource.model.js';
import fs from 'fs';
import path from 'path';
import { saveFile, saveResourceFile } from '../../utils/saveFile.js';

// Helper function to validate YouTube URL
function isValidYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}

// POST /resources - Create new resource
export async function create(req, res) {
  try {
    const { type, title, content, video_url } = req.body;
    
    // Validate required fields
    if (!type || !title) {
      return res.status(400).json({ message: "Type and title are required" });
    }

    let file_url = null;

    // Handle different resource types
    if (type === 'video') {
      // For videos, check if it's a YouTube URL or uploaded file
      if (video_url) {
        if (!isValidYouTubeUrl(video_url)) {
          return res.status(400).json({ message: "Invalid YouTube URL" });
        }
        file_url = video_url;
      } else if (req.file) {
        // Upload non-YouTube video file to Cloudinary
        file_url = await saveResourceFile(req.file);
      } else {
        return res.status(400).json({ message: "Video URL or video file is required for video type" });
      }
    } else {
      // For curriculum and concept, file upload is required
      if (!req.file) {
        return res.status(400).json({ message: "File is required for curriculum and concept types" });
      }
      // Upload file to Cloudinary
      file_url = await saveResourceFile(req.file);
    }

    const resource = await ResourceModel.createResource({ 
      type, 
      title, 
      content: content || null, 
      file_url 
    });

    res.status(201).json(resource);
  } catch (err) {
    console.error('Create resource error:', err);
    res.status(500).json({ message: err.message });
  }
}

// GET /resources - List all resources with optional pagination and search
export async function list(req, res) {
  try {
    const { page, limit, search } = req.query;
    
    if (page && limit) {
      // Return paginated results
      const result = await ResourceModel.listResources(
        parseInt(page) || 1, 
        parseInt(limit) || 10, 
        search || ''
      );
      res.json(result);
    } else {
      // Return all resources (for frontend compatibility)
      const resources = await ResourceModel.getAllResources();
      res.json(resources);
    }
  } catch (err) {
    console.error('List resources error:', err);
    res.status(500).json({ message: err.message });
  }
}

// GET /resources/:resource_id - Get single resource
export async function get(req, res) {
  try {
    const resource = await ResourceModel.getResourceById(req.params.resource_id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    res.json(resource);
  } catch (err) {
    console.error('Get resource error:', err);
    res.status(500).json({ message: err.message });
  }
}

// PUT /resources/:resource_id - Update resource
export async function update(req, res) {
  try {
    const { type, title, content, video_url } = req.body;
    const resource_id = req.params.resource_id;

    // Get existing resource
    const existingResource = await ResourceModel.getResourceById(resource_id);
    if (!existingResource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    let file_url = existingResource.file_url; // Keep existing file by default

    // Handle file updates based on type
    if (type === 'video') {
      if (video_url) {
        if (!isValidYouTubeUrl(video_url)) {
          return res.status(400).json({ message: "Invalid YouTube URL" });
        }
        // No local deletion necessary when using Cloudinary URLs
        file_url = video_url;
      } else if (req.file) {
        // Upload new video file to Cloudinary
        file_url = await saveResourceFile(req.file);
      }
    } else {
      // For curriculum and concept
      if (req.file) {
        // Upload replacement file to Cloudinary
        file_url = await saveResourceFile(req.file);
      }
    }

    const updatedResource = await ResourceModel.updateResource(resource_id, { 
      type: type || existingResource.type, 
      title: title || existingResource.title, 
      content: content !== undefined ? content : existingResource.content, 
      file_url 
    });

    if (!updatedResource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    res.json(updatedResource);
  } catch (err) {
    console.error('Update resource error:', err);
    res.status(500).json({ message: err.message });
  }
}

// DELETE /resources/:resource_id - Delete resource
export async function remove(req, res) {
  try {
    const resource_id = req.params.resource_id;
    
    // Get resource to delete associated file
    // With Cloudinary URLs, nothing to delete locally. If older records used local files,
    // you may keep the cleanup below, otherwise it's safe to skip.
    const resource = await ResourceModel.getResourceById(resource_id);
    if (resource && resource.file_url && resource.file_url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(resource.file_url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await ResourceModel.deleteResource(resource_id);
    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error('Delete resource error:', err);
    res.status(500).json({ message: err.message });
  }
}