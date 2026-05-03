import * as NegProtoforialModel from '../models/negprotoforial.model.js';
import uploadToCloudinary from '../services/fileUploadService.js';

const VALID_TYPES      = ['image', 'video', 'document', 'text'];
const VALID_CATEGORIES = ['MEP Training', 'MEP Projects', 'Consultancy', 'Architecture'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const validateType = (type) => VALID_TYPES.includes(type);
const validateCategory = (category) => VALID_CATEGORIES.includes(category);

// file_url is required for image / video / document; text_content lives in description
const requiresFileUrl = (type) => ['image', 'video', 'document'].includes(type);
const isValidUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /admin/negprotoforial
 * All records (active + inactive)
 */
const getAll = async (req, res) => {
  try {
    const records = await NegProtoforialModel.getAll();
    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error('negprotoforial getAll error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/negprotoforial/:id
 */
const getById = async (req, res) => {
  try {
    const record = await NegProtoforialModel.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error('negprotoforial getById error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /admin/negprotoforial
 * Body: { title, category, type, file_url?, description?, is_active? }
 */
const create = async (req, res) => {
  try {
    const { title, category, type, file_url, description, is_active } = req.body;
    const hasUpload = Boolean(req.file);
    const hasUrl = Boolean(file_url && String(file_url).trim());
    let resolvedFileUrl = hasUrl ? String(file_url).trim() : null;

    // Required fields
    if (!title || !category || !type) {
      return res.status(400).json({
        success: false,
        message: 'title, category, and type are required',
      });
    }

    // Validate type
    if (!validateType(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    // Validate category
    if (!validateCategory(category)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    if (requiresFileUrl(type)) {
      if (hasUpload && hasUrl) {
        return res.status(400).json({
          success: false,
          message: 'Provide either upload file or file_url, not both',
        });
      }
      if (!hasUpload && !hasUrl) {
        return res.status(400).json({
          success: false,
          message: `file upload or file_url is required when type is "${type}"`,
        });
      }
      if (hasUrl && !isValidUrl(resolvedFileUrl)) {
        return res.status(400).json({
          success: false,
          message: 'file_url must be a valid URL',
        });
      }
    }

    if (hasUpload) {
      const resourceType = type === 'video' ? 'video' : type === 'document' ? 'raw' : 'image';
      resolvedFileUrl = await uploadToCloudinary(req.file.buffer, 'elearning/negprotoforial', resourceType);
    }

    // file_url required for image / video / document
    if (requiresFileUrl(type) && !resolvedFileUrl) {
      return res.status(400).json({
        success: false,
        message: `file_url is required when type is "${type}"`,
      });
    }

    // description required for text type
    if (type === 'text' && !description) {
      return res.status(400).json({
        success: false,
        message: 'description is required when type is "text"',
      });
    }

    const record = await NegProtoforialModel.create({
      title,
      category,
      type,
      file_url: resolvedFileUrl,
      description,
      is_active,
    });

    return res.status(201).json({
      success: true,
      message: 'Record created successfully',
      data: record,
    });
  } catch (error) {
    console.error('negprotoforial create error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PUT /admin/negprotoforial/:id
 * Body: any updatable fields
 */
const update = async (req, res) => {
  try {
    const { title, category, type, file_url, description, is_active } = req.body;
    const existing = await NegProtoforialModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const hasUpload = Boolean(req.file);
    const hasUrl = Boolean(file_url && String(file_url).trim());
    let resolvedFileUrl = hasUrl ? String(file_url).trim() : null;

    if (type && !validateType(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (category && !validateCategory(category)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const nextType = type || existing.type;
    const nextDescription = description !== undefined ? description : existing.description;

    if (requiresFileUrl(nextType)) {
      if (hasUpload && hasUrl) {
        return res.status(400).json({
          success: false,
          message: 'Provide either upload file or file_url, not both',
        });
      }
      if (hasUrl && !isValidUrl(resolvedFileUrl)) {
        return res.status(400).json({
          success: false,
          message: 'file_url must be a valid URL',
        });
      }
    }

    if (hasUpload) {
      const resourceType = nextType === 'video' ? 'video' : nextType === 'document' ? 'raw' : 'image';
      resolvedFileUrl = await uploadToCloudinary(req.file.buffer, 'elearning/negprotoforial', resourceType);
    }

    const nextFileUrl = resolvedFileUrl || existing.file_url;

    if (requiresFileUrl(nextType) && !nextFileUrl) {
      return res.status(400).json({
        success: false,
        message: `file_url is required when type is "${nextType}"`,
      });
    }

    if (nextType === 'text' && !nextDescription) {
      return res.status(400).json({
        success: false,
        message: 'description is required when type is "text"',
      });
    }

    const updated = await NegProtoforialModel.update(req.params.id, {
      title,
      category,
      type: nextType,
      file_url: nextFileUrl,
      description,
      is_active,
    });

    return res.status(200).json({
      success: true,
      message: 'Record updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('negprotoforial update error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /admin/negprotoforial/:id/toggle
 * Flip is_active without a full body update
 */
const toggleActive = async (req, res) => {
  try {
    const updated = await NegProtoforialModel.toggleActive(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.status(200).json({
      success: true,
      message: `Record is now ${updated.is_active ? 'visible' : 'hidden'}`,
      data: updated,
    });
  } catch (error) {
    console.error('negprotoforial toggleActive error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /admin/negprotoforial/:id
 */
const remove = async (req, res) => {
  try {
    const deleted = await NegProtoforialModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Record deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('negprotoforial delete error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── PUBLIC / STUDENT ─────────────────────────────────────────────────────────

/**
 * GET /negprotoforial
 * All records; supports optional ?category= and/or ?type= query filters
 *
 * Examples:
 *   GET /negprotoforial
 *   GET /negprotoforial?category=MEP Training
 *   GET /negprotoforial?type=video
 *   GET /negprotoforial?category=Architecture&type=image
 */
const getActiveRecords = async (req, res) => {
  try {
    const { category, type } = req.query;

    // Validate optional query params
    if (type && !validateType(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (category && !validateCategory(category)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    let records;

    if (category && type) {
      records = await NegProtoforialModel.getByCategoryAndType(category, type);
    } else if (category) {
      records = await NegProtoforialModel.getByCategory(category);
    } else if (type) {
      records = await NegProtoforialModel.getByType(type);
    } else {
      records = await NegProtoforialModel.getActive();
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error('negprotoforial getActiveRecords error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /negprotoforial/:id
 * Single record by ID (public)
 */
const getActiveById = async (req, res) => {
  try {
    const record = await NegProtoforialModel.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error('negprotoforial getActiveById error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export {
  getAll,
  getById,
  create,
  update,
  toggleActive,
  remove,
  getActiveRecords,
  getActiveById,
};
