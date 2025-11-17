import sql from '../../config/db.js';

// Create a lesson or sublesson
export async function createLesson({ 
  title, 
  content, 
  project_id, 
  parent_lesson_id, 
  order_num,
  week_id = null
}) {
  const [lesson] = await sql`
    INSERT INTO lessons (
      title, content, project_id, parent_lesson_id, 
      order_num, week_id
    )
    VALUES (
      ${title}, ${content}, ${project_id}, ${parent_lesson_id}, 
      ${order_num}, ${week_id}
    )
    RETURNING *
  `;
  return lesson;
}

// Get all lessons (optionally filter by project)
export async function getAllLessons({ project_id = null } = {}) {
  const projectFilter = project_id ? sql`AND l.project_id = ${project_id}` : sql``;

  const lessons = await sql`
    SELECT
      l.*,
      COALESCE(file_data.files, '[]'::json) AS files_json,
      file_data.file_url AS primary_file_url,
      file_data.image_url AS primary_image_url,
      file_data.video_url AS primary_video_url
    FROM lessons l
    LEFT JOIN LATERAL (
      SELECT
        json_agg(
          json_build_object(
            'file_id', lf.file_id,
            'file_url', lf.file_url,
            'file_name', lf.file_name,
            'file_type', lf.file_type,
            'file_size_bytes', lf.file_size_bytes,
            'uploaded_at', lf.uploaded_at
          )
          ORDER BY lf.uploaded_at
        ) AS files,
        MIN(CASE
              WHEN lf.file_type IS NULL
                OR (lf.file_type NOT LIKE 'image/%' AND lf.file_type NOT LIKE 'video/%')
              THEN lf.file_url
            END) AS file_url,
        MIN(CASE
              WHEN lf.file_type LIKE 'image/%'
                OR lf.file_type = 'image/remote'
              THEN lf.file_url
            END) AS image_url,
        MIN(CASE
              WHEN lf.file_type LIKE 'video/%'
                OR lf.file_type = 'text/url'
              THEN lf.file_url
            END) AS video_url
      FROM lesson_files lf
      WHERE lf.lesson_id = l.lesson_id
    ) AS file_data ON TRUE
    WHERE l.parent_lesson_id IS NULL
    ${projectFilter}
    ORDER BY l.order_num ASC NULLS FIRST, l.created_at ASC
  `;
  return lessons.map(({ 
    files_json, 
    primary_file_url, 
    primary_image_url, 
    primary_video_url, 
    ...lesson 
  }) => ({
    ...lesson,
    file_url: lesson.file_url || primary_file_url || null,
    upload_image: lesson.upload_image || primary_image_url || null,
    image_url: lesson.upload_image || primary_image_url || null,
    video_url: lesson.video_url || primary_video_url || null,
    files: files_json,
    lesson_files: files_json
  }));
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
  order_num, week_id = null
}) {
  const [lesson] = await sql`
    UPDATE lessons SET
      title = COALESCE(${title}, title),
      content = COALESCE(${content}, content),
      project_id = COALESCE(${project_id}, project_id),
      parent_lesson_id = COALESCE(${parent_lesson_id}, parent_lesson_id),
      order_num = COALESCE(${order_num}, order_num),
      week_id = COALESCE(${week_id}, week_id),
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