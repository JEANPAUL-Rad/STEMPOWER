import * as LessonModel from '../../models/admin/lesson.model.js';
import * as LessonFileModel from '../../models/admin/lesson_file.model.js';
import { saveLessonFile } from '../../utils/saveFile.js';

export async function createLesson(req, res) {
  try {
    const {
      title,
      content,
      project_id,
      parent_lesson_id,
      order_num,
      week_id,
      file_urls,
      file_url,
      upload_image,
      video_url
    } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const lesson = await LessonModel.createLesson({
      title: title ?? null,
      content: content ?? null,
      project_id: project_id ?? null,
      parent_lesson_id: parent_lesson_id ?? null,
      order_num: order_num ?? null,
      week_id: week_id ?? null
    });

    // Handle multiple file uploads (binary)
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    const uploadedFiles = [];
    for (const file of files) {
      const url = await saveLessonFile(file);
      const meta = await LessonFileModel.addLessonFile({
        lesson_id: lesson.lesson_id,
        file_url: url,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size_bytes: file.size,
        uploaded_by: req.user?.user_id || null,
      });
      uploadedFiles.push(meta);
    }
    // Handle pre-uploaded file URLs passed in body (accept file_urls or file_url)
    const stringUrls = [];
    if (Array.isArray(file_urls)) {
      stringUrls.push(...file_urls);
    } else if (typeof file_urls === 'string' && file_urls.trim() !== '') {
      stringUrls.push(
        ...file_urls.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }
    if (file_url && typeof file_url === 'string') {
      stringUrls.push(file_url.trim());
    }
    // Deduplicate
    const uniqueUrls = [...new Set(stringUrls.filter(Boolean))];
    for (const url of uniqueUrls) {
      const meta = await LessonFileModel.addLessonFile({
        lesson_id: lesson.lesson_id,
        file_url: url,
        file_name: url.split('/').pop() || null,
        file_type: null,
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
      uploadedFiles.push(meta);
    }

    // Handle optional standalone image/video URLs
    const imageUrl = typeof upload_image === 'string' ? upload_image.trim() : '';
    if (imageUrl) {
      const meta = await LessonFileModel.addLessonFile({
        lesson_id: lesson.lesson_id,
        file_url: imageUrl,
        file_name: imageUrl.split('/').pop() || null,
        file_type: 'image/remote',
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
      uploadedFiles.push(meta);
    }

    const videoUrl = typeof video_url === 'string' ? video_url.trim() : '';
    if (videoUrl) {
      const meta = await LessonFileModel.addLessonFile({
        lesson_id: lesson.lesson_id,
        file_url: videoUrl,
        file_name: videoUrl.split('/').pop() || 'video-link',
        file_type: 'text/url',
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
      uploadedFiles.push(meta);
    }

    res.status(201).json({ ...lesson, files: uploadedFiles });
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
    const files = await LessonFileModel.getFilesByLessonId(lesson.lesson_id);
    res.json({ ...lesson, files });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateLesson(req, res) {
  try {
    const {
      title,
      content,
      project_id,
      parent_lesson_id,
      order_num,
      week_id,
      remove_file_ids,
      file_urls,
      file_url,
      upload_image,
      video_url
    } = req.body || {};

    const payload = {
      title: title ?? null,
      content: content ?? null,
      project_id: project_id ?? null,
      parent_lesson_id: parent_lesson_id ?? null,
      order_num: order_num ?? null,
      week_id: week_id ?? null
    };

    const lessonId = Number(req.params.lesson_id);
    const updated = await LessonModel.updateLesson(lessonId, payload);
    if (!updated) return res.status(404).json({ message: 'Lesson not found' });

    // Remove selected files if requested
    if (remove_file_ids) {
      const ids = Array.isArray(remove_file_ids)
        ? remove_file_ids
        : String(remove_file_ids)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      for (const id of ids) {
        await LessonFileModel.deleteFile(Number(id));
      }
    }

    // Add new files (binary)
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const file of files) {
      const url = await saveLessonFile(file);
      await LessonFileModel.addLessonFile({
        lesson_id: lessonId,
        file_url: url,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size_bytes: file.size,
        uploaded_by: req.user?.user_id || null,
      });
    }
    // Add pre-uploaded file URLs
    const pendingUrls = [];
    if (Array.isArray(file_urls)) {
      pendingUrls.push(...file_urls);
    } else if (typeof file_urls === 'string' && file_urls.trim() !== '') {
      pendingUrls.push(
        ...file_urls.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }
    if (file_url && typeof file_url === 'string') {
      pendingUrls.push(file_url.trim());
    }
    const uniquePending = [...new Set(pendingUrls.filter(Boolean))];
    for (const url of uniquePending) {
      await LessonFileModel.addLessonFile({
        lesson_id: lessonId,
        file_url: url,
        file_name: url.split('/').pop() || null,
        file_type: null,
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
    }

    const imageUrlUpdate = typeof upload_image === 'string' ? upload_image.trim() : '';
    if (imageUrlUpdate) {
      await LessonFileModel.addLessonFile({
        lesson_id: lessonId,
        file_url: imageUrlUpdate,
        file_name: imageUrlUpdate.split('/').pop() || null,
        file_type: 'image/remote',
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
    }

    const videoUrlUpdate = typeof video_url === 'string' ? video_url.trim() : '';
    if (videoUrlUpdate) {
      await LessonFileModel.addLessonFile({
        lesson_id: lessonId,
        file_url: videoUrlUpdate,
        file_name: videoUrlUpdate.split('/').pop() || 'video-link',
        file_type: 'text/url',
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
    }

    const filesNow = await LessonFileModel.getFilesByLessonId(lessonId);
    res.json({ ...updated, files: filesNow });
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