import * as ProjectModel from '../../models/admin/project.model.js';

// Create a new project (assign to week)
export async function createProject(req, res) {
  try {
    const { title, short_description, image_url, video_url, week_id, order_num } = req.body;
    
    if (!title || !week_id) {
      return res.status(400).json({ message: 'Title and week_id are required.' });
    }

    // Handle image_url - it could come from:
    // 1. req.file (if uploaded as multipart)
    // 2. req.body.image_url (if uploaded separately first)
    let finalImageUrl = null;
    // Normalize common invalid string values
    const normalizedBodyImage = typeof image_url === 'string' ? image_url.trim() : image_url;
    const isInvalidString = normalizedBodyImage === 'undefined' || normalizedBodyImage === 'null' || normalizedBodyImage === '';
    
    if (req.file) {
      // If uploaded as multipart, store just the filename
      finalImageUrl = req.file.filename;
    } else if (normalizedBodyImage && !isInvalidString) {
      // If uploaded separately and sent in body, extract just the filename
      // Handle cases like "/uploads/filename.jpg" or "filename.jpg"
      if (normalizedBodyImage.startsWith('/uploads/')) {
        finalImageUrl = normalizedBodyImage.replace('/uploads/', '');
      } else if (normalizedBodyImage.includes('/uploads/')) {
        finalImageUrl = normalizedBodyImage.split('/uploads/')[1];
      } else {
        finalImageUrl = normalizedBodyImage;
      }
    }

    const project = await ProjectModel.createProject({
      title,
      short_description,
      image_url: finalImageUrl, // just the filename
      video_url,
      week_id,
      order_num
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Update a project
export async function updateProject(req, res) {
  try {
    const { title, short_description, image_url, video_url, week_id, order_num } = req.body;
    
    // Handle image_url for updates too
    let finalImageUrl = image_url;
    const normalizedBodyImage = typeof image_url === 'string' ? image_url.trim() : image_url;
    const isInvalidString = normalizedBodyImage === 'undefined' || normalizedBodyImage === 'null' || normalizedBodyImage === '';
    
    if (req.file) {
      // If uploaded as multipart, store just the filename
      finalImageUrl = req.file.filename;
    } else if (normalizedBodyImage && !isInvalidString) {
      // If uploaded separately and sent in body, extract just the filename
      if (normalizedBodyImage.startsWith('/uploads/')) {
        finalImageUrl = normalizedBodyImage.replace('/uploads/', '');
      } else if (normalizedBodyImage.includes('/uploads/')) {
        finalImageUrl = normalizedBodyImage.split('/uploads/')[1];
      } else {
        finalImageUrl = normalizedBodyImage;
      }
    } else {
      // Explicitly clear invalid string values to null
      finalImageUrl = null;
    }

    const updated = await ProjectModel.updateProject(req.params.project_id, {
      title,
      short_description,
      image_url: finalImageUrl,
      video_url,
      week_id,
      order_num
    });
    
    if (!updated) return res.status(404).json({ message: 'Project not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// List all projects (optionally filter by week)
export async function getAllProjects(req, res) {
  try {
    const { week_id } = req.query;
    const projects = await ProjectModel.getAllProjects({ week_id });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get project details by ID
export async function getProjectById(req, res) {
  try {
    const project = await ProjectModel.getProjectById(req.params.project_id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Delete a project
export async function deleteProject(req, res) {
  try {
    const projectId = Number(req.params.project_id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    await ProjectModel.deleteProject(projectId);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    // Handle FK violation (lessons referencing this project)
    if (err && err.code === '23503') {
      return res.status(409).json({
        message: 'Cannot delete project while lessons are linked to it. Move or delete the lessons first.',
        detail: err.detail
      });
    }
    res.status(500).json({ message: err.message });
  }
}