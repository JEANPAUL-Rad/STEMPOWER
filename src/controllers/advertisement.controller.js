import * as AdvertisementModel from '../models/advertisement.model.js';
import uploadToCloudinary from '../services/fileUploadService.js';

const VALID_TYPES = ['image', 'video', 'text'];
const normalizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(v)) return true;
    if (['false', '0', 'no'].includes(v)) return false;
  }
  return fallback;
};

const parseNullableDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const isValidUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const isInvalidAdvertisementApiUrl = (url = '') =>
  /\/api\/advertisements\/\d+$/i.test(String(url).trim());

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /admin/advertisements
 * Returns all advertisements
 */
const getAllAdvertisements = async (req, res) => {
  try {
    const ads = await AdvertisementModel.getAll();
    return res.status(200).json({
      success: true,
      count: ads.length,
      data: ads,
    });
  } catch (error) {
    console.error('getAllAdvertisements error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/advertisements/:id
 */
const getAdvertisementById = async (req, res) => {
  try {
    const ad = await AdvertisementModel.getById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }
    return res.status(200).json({ success: true, data: ad });
  } catch (error) {
    console.error('getAdvertisementById error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /admin/advertisements
 * Body: { title, type, file_url?, text_content?, link?, is_active?, start_date?, end_date?, priority? }
 */
const createAdvertisement = async (req, res) => {
  try {
    const {
      title,
      type,
      file_url,
      text_content,
      link,
      is_active,
      start_date,
      end_date,
      priority,
    } = req.body;
    const hasUpload = Boolean(req.file);
    const hasUrl = Boolean(file_url && String(file_url).trim());
    let resolvedFileUrl = hasUrl ? String(file_url).trim() : null;

    if (req.file) {
      const isVideo = req.file.mimetype?.startsWith('video/');
      resolvedFileUrl = await uploadToCloudinary(
        req.file.buffer,
        'elearning/advertisements',
        isVideo ? 'video' : 'image'
      );
    }

    // Validation
    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'Title and type are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (type === 'image' || type === 'video') {
      if (hasUpload && hasUrl) {
        return res.status(400).json({
          success: false,
          message: 'Provide either file upload or file_url, not both',
        });
      }
      if (!hasUpload && !hasUrl) {
        return res.status(400).json({
          success: false,
          message: `For type "${type}", provide file upload or file_url`,
        });
      }
      if (hasUrl && !isValidUrl(resolvedFileUrl)) {
        return res.status(400).json({ success: false, message: 'file_url must be a valid URL' });
      }
      if (hasUrl && isInvalidAdvertisementApiUrl(resolvedFileUrl)) {
        return res.status(400).json({
          success: false,
          message: 'file_url must point to a real media file, not advertisement API endpoint',
        });
      }
    }

    if ((type === 'image' || type === 'video') && !resolvedFileUrl) {
      return res
        .status(400)
        .json({ success: false, message: `file_url is required for type "${type}"` });
    }

    if (type === 'text' && !text_content) {
      return res
        .status(400)
        .json({ success: false, message: 'text_content is required for type "text"' });
    }

    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res
        .status(400)
        .json({ success: false, message: 'start_date must be before end_date' });
    }

    const ad = await AdvertisementModel.create({
      title,
      type,
      file_url: resolvedFileUrl,
      text_content,
      link,
      is_active: normalizeBoolean(is_active, true),
      start_date: parseNullableDate(start_date),
      end_date: parseNullableDate(end_date),
      priority: priority !== undefined ? Number(priority) : 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      data: ad,
    });
  } catch (error) {
    console.error('createAdvertisement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PUT /admin/advertisements/:id
 * Body: any updatable fields
 */
const updateAdvertisement = async (req, res) => {
  try {
    const {
      title,
      type,
      file_url,
      text_content,
      link,
      is_active,
      start_date,
      end_date,
      priority,
    } = req.body;
    const existing = await AdvertisementModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    const hasUpload = Boolean(req.file);
    const hasUrl = Boolean(file_url && String(file_url).trim());
    let resolvedFileUrl = hasUrl ? String(file_url).trim() : null;
    if (req.file) {
      const isVideo = req.file.mimetype?.startsWith('video/');
      resolvedFileUrl = await uploadToCloudinary(
        req.file.buffer,
        'elearning/advertisements',
        isVideo ? 'video' : 'image'
      );
    }

    const nextType = type || existing.type;
    const nextFileUrl = resolvedFileUrl || existing.file_url;
    const nextTextContent = text_content !== undefined ? text_content : existing.text_content;

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res
        .status(400)
        .json({ success: false, message: 'start_date must be before end_date' });
    }

    if ((nextType === 'image' || nextType === 'video') && hasUpload && hasUrl) {
      return res.status(400).json({
        success: false,
        message: 'Provide either file upload or file_url, not both',
      });
    }
    if (hasUrl && !isValidUrl(resolvedFileUrl)) {
      return res.status(400).json({ success: false, message: 'file_url must be a valid URL' });
    }
    if (hasUrl && isInvalidAdvertisementApiUrl(resolvedFileUrl)) {
      return res.status(400).json({
        success: false,
        message: 'file_url must point to a real media file, not advertisement API endpoint',
      });
    }

    if ((nextType === 'image' || nextType === 'video') && !nextFileUrl) {
      return res.status(400).json({ success: false, message: `file_url is required for type "${nextType}"` });
    }

    if (nextType === 'text' && !nextTextContent) {
      return res.status(400).json({ success: false, message: 'text_content is required for type "text"' });
    }

    const updated = await AdvertisementModel.update(req.params.id, {
      title,
      type: nextType,
      file_url: nextFileUrl,
      text_content,
      link,
      is_active: is_active !== undefined ? normalizeBoolean(is_active, existing.is_active) : undefined,
      start_date: start_date !== undefined ? parseNullableDate(start_date) : undefined,
      end_date: end_date !== undefined ? parseNullableDate(end_date) : undefined,
      priority: priority !== undefined ? Number(priority) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('updateAdvertisement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /admin/advertisements/:id/toggle
 */
const toggleAdvertisement = async (req, res) => {
  try {
    const updated = await AdvertisementModel.toggleActive(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }
    return res.status(200).json({
      success: true,
      message: `Advertisement is now ${updated.is_active ? 'active' : 'inactive'}`,
      data: updated,
    });
  } catch (error) {
    console.error('toggleAdvertisement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /admin/advertisements/:id
 */
const deleteAdvertisement = async (req, res) => {
  try {
    const deleted = await AdvertisementModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('deleteAdvertisement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── PUBLIC / STUDENT ─────────────────────────────────────────────────────────

/**
 * GET /advertisements/active
 * Active ads within their valid date range
 */
const getActiveAdvertisements = async (req, res) => {
  try {
    const ads = await AdvertisementModel.getActive();
    return res.status(200).json({
      success: true,
      count: ads.length,
      data: ads,
    });
  } catch (error) {
    console.error('getActiveAdvertisements error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /advertisements/type/:type
 * Active ads filtered by type (image | video | text)
 */
const getAdvertisementsByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    const ads = await AdvertisementModel.getByType(type);
    return res.status(200).json({
      success: true,
      count: ads.length,
      data: ads,
    });
  } catch (error) {
    console.error('getAdvertisementsByType error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export {
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  toggleAdvertisement,
  deleteAdvertisement,
  getActiveAdvertisements,
  getAdvertisementsByType,
};
