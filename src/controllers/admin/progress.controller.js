import * as ProgressModel from '../../models/admin/progress.model.js';

// POST /progress
export async function create(req, res) {
  try {
    const { user_id, lesson_id, completed, completed_at } = req.body;
    if (!user_id || !lesson_id) {
      return res.status(400).json({ message: "user_id and lesson_id required" });
    }
    const progress = await ProgressModel.createProgress({
      user_id, lesson_id, completed, completed_at
    });
    res.status(201).json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /progress (with pagination)
export async function list(req, res) {
  try {
    const { user_id, lesson_id } = req.query;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    
    const progress = await ProgressModel.listProgress({ user_id, lesson_id, limit, offset });
    res.json({
      success: true,
      data: progress,
      pagination: {
        limit,
        offset,
        count: progress.length
      }
    });
  } catch (err) {
    console.error('Error listing progress:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
}

// GET /progress/:progress_id
export async function get(req, res) {
  try {
    const progress = await ProgressModel.getProgressById(req.params.progress_id);
    if (!progress) return res.status(404).json({ message: "Not found" });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /progress/:progress_id
export async function update(req, res) {
  try {
    const progress = await ProgressModel.updateProgress(req.params.progress_id, req.body);
    if (!progress) return res.status(404).json({ message: "Not found" });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /progress/:progress_id
export async function remove(req, res) {
  try {
    await ProgressModel.deleteProgress(req.params.progress_id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}