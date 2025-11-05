import sql from '../../config/db.js';

// Create a lesson or sublesson
export async function createLesson({ 
  title, 
  content, 
  project_id, 
  parent_lesson_id, 
  order_num, 
  file_url,
  upload_image,
  video_url 
}) {
  const [lesson] = await sql`
    INSERT INTO lessons (
      title, content, project_id, parent_lesson_id, 
      order_num, file_url, upload_image, video_url
    )
    VALUES (
      ${title}, ${content}, ${project_id}, ${parent_lesson_id}, 
      ${order_num}, ${file_url}, ${upload_image}, ${video_url}
    )
    RETURNING *
  `;
  return lesson;
}

// Get all lessons (optionally filter by project)
export async function getAllLessons({ project_id = null } = {}) {
  let lessons;
  if (project_id) {
    lessons = await sql`
      SELECT * FROM lessons
      WHERE parent_lesson_id IS NULL AND project_id = ${project_id}
      ORDER BY order_num ASC, created_at ASC
    `;
  } else {
    lessons = await sql`
      SELECT * FROM lessons
      WHERE parent_lesson_id IS NULL
      ORDER BY order_num ASC, created_at ASC
    `;
  }
  return lessons;
}

// Get lesson by id (include sublessons)
export async function getLessonById(lesson_id) {
  const [lesson] = await sql`
    SELECT * FROM lessons WHERE lesson_id = ${lesson_id}
  `;
  if (!lesson) return null;
  
  lesson.sublessons = await sql`
    SELECT * FROM lessons
    WHERE parent_lesson_id = ${lesson_id}
    ORDER BY order_num ASC, created_at ASC
  `;
  return lesson;
}

// Update lesson
export async function updateLesson(lesson_id, { 
  title, content, project_id, parent_lesson_id, 
  order_num, file_url, upload_image, video_url 
}) {
  const [lesson] = await sql`
    UPDATE lessons SET
      title = COALESCE(${title}, title),
      content = COALESCE(${content}, content),
      project_id = COALESCE(${project_id}, project_id),
      parent_lesson_id = COALESCE(${parent_lesson_id}, parent_lesson_id),
      order_num = COALESCE(${order_num}, order_num),
      file_url = COALESCE(${file_url}, file_url),
      upload_image = COALESCE(${upload_image}, upload_image),
      video_url = COALESCE(${video_url}, video_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE lesson_id = ${lesson_id}
    RETURNING *
  `;
  return lesson;
}

// Delete lesson (and its sublessons)
export async function deleteLesson(lesson_id) {
  await sql`
    DELETE FROM lessons WHERE parent_lesson_id = ${lesson_id}
  `;
  await sql`
    DELETE FROM lessons WHERE lesson_id = ${lesson_id}
  `;
  return true;
}