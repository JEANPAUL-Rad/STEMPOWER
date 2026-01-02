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
      file_names,
      file_name,
      upload_image,
      upload_image_name,
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
    const stringNames = [];
    if (Array.isArray(file_urls)) {
      stringUrls.push(...file_urls);
    } else if (typeof file_urls === 'string' && file_urls.trim() !== '') {
      stringUrls.push(
        ...file_urls.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }
    if (Array.isArray(file_names)) {
      stringNames.push(...file_names);
    } else if (typeof file_names === 'string' && file_names.trim() !== '') {
      stringNames.push(
        ...file_names.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }
    if (file_url && typeof file_url === 'string') {
      stringUrls.push(file_url.trim());
      // Allow an explicit name for single file_url
      if (file_name && typeof file_name === 'string') {
        stringNames.push(file_name.trim());
      } else {
        stringNames.push('');
      }
    }
    // Deduplicate
    const uniqueUrls = [...new Set(stringUrls.filter(Boolean))];
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      const providedName = stringNames[i];
      const meta = await LessonFileModel.addLessonFile({
        lesson_id: lesson.lesson_id,
        file_url: url,
        file_name: (providedName && String(providedName).trim()) ? String(providedName).trim() : (url.split('/').pop() || null),
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
        file_name: (typeof upload_image_name === 'string' && upload_image_name.trim())
          ? upload_image_name.trim()
          : (imageUrl.split('/').pop() || null),
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
      file_names,
      file_name,
      upload_image,
      upload_image_name,
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
    const pendingNames = [];
    if (Array.isArray(file_urls)) {
      pendingUrls.push(...file_urls);
    } else if (typeof file_urls === 'string' && file_urls.trim() !== '') {
      pendingUrls.push(
        ...file_urls.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }
    if (Array.isArray(file_names)) {
      pendingNames.push(...file_names);
    } else if (typeof file_names === 'string' && file_names.trim() !== '') {
      pendingNames.push(
        ...file_names.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }
    if (file_url && typeof file_url === 'string') {
      pendingUrls.push(file_url.trim());
      if (file_name && typeof file_name === 'string') {
        pendingNames.push(file_name.trim());
      } else {
        pendingNames.push('');
      }
    }
    const uniquePending = [...new Set(pendingUrls.filter(Boolean))];
    for (let i = 0; i < uniquePending.length; i++) {
      const url = uniquePending[i];
      const providedName = pendingNames[i];
      await LessonFileModel.addLessonFile({
        lesson_id: lessonId,
        file_url: url,
        file_name: (providedName && String(providedName).trim()) ? String(providedName).trim() : (url.split('/').pop() || null),
        file_type: null,
        file_size_bytes: null,
        uploaded_by: req.user?.user_id || null,
      });
    }

    // Enforce single primary file (non-image, non-video) if explicit file_url provided
    if (file_url !== undefined) {
      const newFileUrl = typeof file_url === 'string' ? file_url.trim() : '';
      const existingFiles = await LessonFileModel.getFilesByLessonId(lessonId);
      const oldPrimaryFiles = existingFiles.filter(f =>
        !f.file_type || (f.file_type && !f.file_type.startsWith('image/') && !f.file_type.startsWith('video/'))
      );
      if (newFileUrl) {
        let exists = false;
        for (const f of oldPrimaryFiles) {
          if (f.file_url === newFileUrl) {
            exists = true;
          } else {
            await LessonFileModel.deleteFile(f.file_id);
          }
        }
        if (!exists) {
          await LessonFileModel.addLessonFile({
            lesson_id: lessonId,
            file_url: newFileUrl,
            file_name: (typeof file_name === 'string' && file_name.trim())
              ? file_name.trim()
              : (newFileUrl.split('/').pop() || null),
            file_type: null,
            file_size_bytes: null,
            uploaded_by: req.user?.user_id || null,
          });
        }
      } else {
        // Clearing the primary file
        for (const f of oldPrimaryFiles) {
          await LessonFileModel.deleteFile(f.file_id);
        }
      }
    }

    // Handle optional standalone image/video URLs
    // Enforce single image: delete old images if a new one is provided or cleared
    if (upload_image !== undefined) {
      const imageUrlUpdate = typeof upload_image === 'string' ? upload_image.trim() : '';
      
      const existingFiles = await LessonFileModel.getFilesByLessonId(lessonId);
      const oldImages = existingFiles.filter(f => 
        (f.file_type && f.file_type.startsWith('image/')) || 
        f.file_type === 'image/remote'
      );

      if (imageUrlUpdate) {
        let exists = false;
        for (const img of oldImages) {
          if (img.file_url === imageUrlUpdate) {
            exists = true;
          } else {
            await LessonFileModel.deleteFile(img.file_id);
          }
        }
        
        if (!exists) {
          await LessonFileModel.addLessonFile({
            lesson_id: lessonId,
            file_url: imageUrlUpdate,
            file_name: (typeof upload_image_name === 'string' && upload_image_name.trim())
              ? upload_image_name.trim()
              : (imageUrlUpdate.split('/').pop() || null),
            file_type: 'image/remote',
            file_size_bytes: null,
            uploaded_by: req.user?.user_id || null,
          });
        }
      } else {
        // Explicitly cleared (empty string or null passed as something else but caught here?)
        // If it was undefined, we wouldn't be here. If it's empty string, we delete all.
        for (const img of oldImages) {
          await LessonFileModel.deleteFile(img.file_id);
        }
      }
    }

    // Enforce single video: delete old videos if a new one is provided or cleared
    if (video_url !== undefined) {
      const videoUrlUpdate = typeof video_url === 'string' ? video_url.trim() : '';
      
      const existingFiles = await LessonFileModel.getFilesByLessonId(lessonId);
      const oldVideos = existingFiles.filter(f => 
        (f.file_type && f.file_type.startsWith('video/')) || 
        f.file_type === 'text/url'
      );

      if (videoUrlUpdate) {
        let exists = false;
        for (const vid of oldVideos) {
          if (vid.file_url === videoUrlUpdate) {
            exists = true;
          } else {
            await LessonFileModel.deleteFile(vid.file_id);
          }
        }
        
        if (!exists) {
          await LessonFileModel.addLessonFile({
            lesson_id: lessonId,
            file_url: videoUrlUpdate,
            file_name: videoUrlUpdate.split('/').pop() || 'video-link',
            file_type: 'text/url',
            file_size_bytes: null,
            uploaded_by: req.user?.user_id || null,
          });
        }
      } else {
        for (const vid of oldVideos) {
          await LessonFileModel.deleteFile(vid.file_id);
        }
      }
    }

    const filesNow = await LessonFileModel.getFilesByLessonId(lessonId);
    res.json({ ...updated, files: filesNow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteLesson(req, res) {
  try {
    const lessonId = Number(req.params.lesson_id);
    if (!Number.isInteger(lessonId)) {
      return res.status(400).json({ message: 'Invalid lesson ID' });
    }

    await LessonModel.deleteLesson(lessonId);
    res.json({ message: "Lesson and its sublessons deleted" });
  } catch (err) {
    // Handle FK violations or constraint errors clearly
    if (err && err.code === '23503') {
      return res.status(409).json({
        message: 'Cannot delete lesson due to linked records. Remove related assignments, files, submissions, or progress first.',
        detail: err.detail
      });
    }
    res.status(500).json({ message: err.message });
  }
}
