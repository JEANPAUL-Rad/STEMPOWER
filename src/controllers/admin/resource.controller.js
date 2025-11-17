
import * as ResourceModel from '../../models/admin/resource.model.js';
import * as ResourceFileModel from '../../models/admin/resource_file.model.js';
import { saveResourceFile } from '../../utils/saveFile.js';

const normalizeBoolean = (value, defaultValue = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return defaultValue;
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// POST /resources - Create new resource
export async function create(req, res) {
  try {
    const {
      type,
      title,
      content,
      video_url,
      module,
      is_public,
      week_id
    } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: 'Type and title are required' });
    }

    const resource = await ResourceModel.createResource({
      type,
      title,
      content: content || null,
      module: module || null,
      is_public: normalizeBoolean(is_public, true),
      week_id: week_id ? Number(week_id) : null
    });

    const uploadedFiles = [];
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const file of files) {
      const url = await saveResourceFile(file);
      const meta = await ResourceFileModel.addResourceFile({
        resource_id: resource.resource_id,
        file_url: url,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size_bytes: file.size,
        uploaded_by: req.user?.user_id || null
      });
      uploadedFiles.push(meta);
    }

    if (video_url && video_url.trim() !== '') {
      if (!isValidUrl(video_url)) {
        return res.status(400).json({ message: 'Invalid video URL provided' });
      }
      const meta = await ResourceFileModel.addResourceFile({
        resource_id: resource.resource_id,
        file_url: video_url.trim(),
        file_name: 'Video Link',
        file_type: 'text/url',
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null
      });
      uploadedFiles.push(meta);
    }

    res.status(201).json({ ...resource, files: uploadedFiles });
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
    const files = await ResourceFileModel.getFilesByResourceId(resource.resource_id);
    res.json({ ...resource, files });
  } catch (err) {
    console.error('Get resource error:', err);
    res.status(500).json({ message: err.message });
  }
}

// PUT /resources/:resource_id - Update resource
export async function update(req, res) {
  try {
    const {
      type,
      title,
      content,
      video_url,
      module,
      is_public,
      week_id,
      remove_file_ids
    } = req.body;
    const resource_id = req.params.resource_id;

    // Get existing resource
    const existingResource = await ResourceModel.getResourceById(resource_id);
    if (!existingResource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const updatedResource = await ResourceModel.updateResource(resource_id, {
      type: type || existingResource.type,
      title: title || existingResource.title,
      content: content !== undefined ? content : existingResource.content,
      module: module !== undefined ? module : existingResource.module,
      is_public:
        is_public !== undefined
          ? normalizeBoolean(is_public, existingResource.is_public)
          : existingResource.is_public,
      week_id: week_id ? Number(week_id) : existingResource.week_id || null
    });

    if (!updatedResource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // Remove selected files if requested
    if (remove_file_ids) {
      const ids = Array.isArray(remove_file_ids)
        ? remove_file_ids
        : String(remove_file_ids)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      for (const id of ids) {
        await ResourceFileModel.deleteFile(Number(id));
      }
    }

    // Add any newly uploaded files
    const addedFiles = [];
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const file of files) {
      const url = await saveResourceFile(file);
      const meta = await ResourceFileModel.addResourceFile({
        resource_id: Number(resource_id),
        file_url: url,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size_bytes: file.size,
        uploaded_by: req.user?.user_id || null,
      });
      addedFiles.push(meta);
    }

    // If video_url provided on update, validate and store as link file
    if (video_url && video_url.trim() !== '') {
      if (!isValidUrl(video_url)) {
        return res.status(400).json({ message: 'Invalid video URL provided' });
      }
      const meta = await ResourceFileModel.addResourceFile({
        resource_id: Number(resource_id),
        file_url: video_url.trim(),
        file_name: 'Video Link',
        file_type: 'text/url',
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
      addedFiles.push(meta);
    }

    const filesNow = await ResourceFileModel.getFilesByResourceId(Number(resource_id));
    res.json({ ...updatedResource, files: filesNow, addedFiles });
  } catch (err) {
    console.error('Update resource error:', err);
    res.status(500).json({ message: err.message });
  }
}

// DELETE /resources/:resource_id - Delete resource
export async function remove(req, res) {
  try {
    const resource_id = req.params.resource_id;
    // Delete metadata rows for files (Cloudinary cleanup optional, URLs public)
    // Note: If you want to also delete files from Cloudinary, store public_id and call API here.
    // For now, just remove DB references.
    await ResourceModel.deleteResource(resource_id);
    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error('Delete resource error:', err);
    res.status(500).json({ message: err.message });
  }
}