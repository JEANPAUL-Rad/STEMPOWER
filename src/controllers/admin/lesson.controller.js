import * as LessonModel from '../../models/admin/lesson.model.js';

export async function createLesson(req, res) {
  try {
    const { 
      title, 
      content, 
      project_id, 
      parent_lesson_id, 
      order_num, 
      file_url,
      upload_image,
      video_url 
    } = req.body;
    
    if (!title) return res.status(400).json({ message: "Title is required" });
    
    const lesson = await LessonModel.createLesson({ 
      title, 
      content, 
      project_id, 
      parent_lesson_id, 
      order_num, 
      file_url,
      upload_image,
      video_url 
    });
    
    res.status(201).json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getAllLessons(req, res) {
  try {
    const project_id = req.query.project_id || null;
    const lessons = await LessonModel.getAllLessons({ project_id });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getLessonById(req, res) {
  try {
    const lesson = await LessonModel.getLessonById(req.params.lesson_id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateLesson(req, res) {
  try {
    const updated = await LessonModel.updateLesson(
      req.params.lesson_id, 
      req.body
    );
    
    if (!updated) return res.status(404).json({ message: "Lesson not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteLesson(req, res) {
  try {
    await LessonModel.deleteLesson(req.params.lesson_id);
    res.json({ message: "Lesson and its sublessons deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}