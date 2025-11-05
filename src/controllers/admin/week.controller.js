import * as WeekModel from '../../models/admin/week.model.js';

export async function createWeek(req, res) {
  try {
    const { title, description, order_num, module } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    // Module is required for new weeks - students need to be enrolled to see content
    if (!module || module.trim() === '') {
      return res.status(400).json({ 
        message: "Module is required. Please assign a module to this week so students enrolled in that module can see it in their dashboard." 
      });
    }
    const week = await WeekModel.createWeek({ title, description, order_num, module });
    res.status(201).json(week);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getAllWeeks(req, res) {
  try {
    const weeks = await WeekModel.getAllWeeks();
    res.json(weeks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getWeekById(req, res) {
  try {
    const week = await WeekModel.getWeekById(req.params.week_id);
    if (!week) return res.status(404).json({ message: "Week not found" });
    res.json(week);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateWeek(req, res) {
  try {
    const updated = await WeekModel.updateWeek(req.params.week_id, req.body);
    if (!updated) return res.status(404).json({ message: "Week not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteWeek(req, res) {
  try {
    await WeekModel.deleteWeek(req.params.week_id);
    res.json({ message: "Week deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}