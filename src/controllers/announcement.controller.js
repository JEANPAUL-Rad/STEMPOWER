import * as AnnouncementModel from '../models/announcement.model.js';

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /admin/announcements
 * Returns all announcements (active + inactive)
 */
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await AnnouncementModel.getAll();
    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error('getAllAnnouncements error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/announcements/:id
 */
const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await AnnouncementModel.getById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    return res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    console.error('getAnnouncementById error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /admin/announcements
 * Body: { title, message, is_active? }
 */
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, is_active } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const announcement = await AnnouncementModel.create({ title, message, is_active });
    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement,
    });
  } catch (error) {
    console.error('createAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PUT /admin/announcements/:id
 * Body: { title?, message?, is_active? }
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { title, message, is_active } = req.body;

    const updated = await AnnouncementModel.update(req.params.id, { title, message, is_active });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('updateAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /admin/announcements/:id/toggle
 * Flip is_active without sending the full body
 */
const toggleAnnouncement = async (req, res) => {
  try {
    const updated = await AnnouncementModel.toggleActive(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    return res.status(200).json({
      success: true,
      message: `Announcement is now ${updated.is_active ? 'active' : 'inactive'}`,
      data: updated,
    });
  } catch (error) {
    console.error('toggleAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /admin/announcements/:id
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await AnnouncementModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('deleteAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── PUBLIC / STUDENT ─────────────────────────────────────────────────────────

/**
 * GET /announcements/active
 * Only active announcements (for students/users)
 */
const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await AnnouncementModel.getActive();
    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error('getActiveAnnouncements error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncements,
};
