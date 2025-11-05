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
    
    if (req.file) {
      // If uploaded as multipart, store just the filename
      finalImageUrl = req.file.filename;
    } else if (image_url) {
      // If uploaded separately and sent in body, extract just the filename
      // Handle cases like "/uploads/filename.jpg" or "filename.jpg"
      if (image_url.startsWith('/uploads/')) {
        finalImageUrl = image_url.replace('/uploads/', '');
      } else if (image_url.includes('/uploads/')) {
        finalImageUrl = image_url.split('/uploads/')[1];
      } else {
        finalImageUrl = image_url;
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
    
    if (req.file) {
      // If uploaded as multipart, store just the filename
      finalImageUrl = req.file.filename;
    } else if (image_url) {
      // If uploaded separately and sent in body, extract just the filename
      if (image_url.startsWith('/uploads/')) {
        finalImageUrl = image_url.replace('/uploads/', '');
      } else if (image_url.includes('/uploads/')) {
        finalImageUrl = image_url.split('/uploads/')[1];
      } else {
        finalImageUrl = image_url;
      }
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
    await ProjectModel.deleteProject(req.params.project_id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}