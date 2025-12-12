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
      COALESCE(w.title, w2.title) AS week_title,
      COALESCE(w.order_num, w2.order_num) AS week_order,
      COALESCE(file_data.files, '[]'::json) AS files_json,
      file_data.file_url AS primary_file_url,
      file_data.image_url AS primary_image_url,
      file_data.video_url AS primary_video_url
    FROM lessons l
    LEFT JOIN projects p ON l.project_id = p.project_id
    LEFT JOIN weeks w ON l.week_id = w.week_id
    LEFT JOIN weeks w2 ON p.week_id = w2.week_id
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
    SELECT * FROM lessons WHERE lesson_id = ${lesson_id}::int
  `;
  if (!lesson) return null;
  
  lesson.sublessons = await sql`
    SELECT * FROM lessons
    WHERE parent_lesson_id = ${lesson_id}::int
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
    WHERE lesson_id = ${lesson_id}::int
    RETURNING *
  `;
  return lesson;
}

// Delete lesson (and its sublessons) along with related files, progress and assignments
export async function deleteLesson(lesson_id) {
  return await sql.begin(async (trx) => {
    // Collect all lesson_ids to delete: the lesson itself and ALL nested sublessons
    const lessonsToDelete = await trx`
      WITH RECURSIVE lesson_tree AS (
        SELECT lesson_id
        FROM lessons
        WHERE lesson_id = ${lesson_id}
        UNION ALL
        SELECT l.lesson_id
        FROM lessons l
        INNER JOIN lesson_tree lt ON l.parent_lesson_id = lt.lesson_id
      )
      SELECT lesson_id FROM lesson_tree
    `;

    const ids = lessonsToDelete.map(l => l.lesson_id);

    if (ids.length > 0) {
      // Find all assignments linked to these lessons
      const assignments = await trx`
        SELECT assignment_id
        FROM assignments
        WHERE lesson_id = ANY(${trx.array(ids)}::int[])
      `;

      const assignmentIds = assignments.map(a => a.assignment_id);

      if (assignmentIds.length > 0) {
        // Delete assignment-related data in proper dependency order

        // 1) Assignment comments
        await trx`
          DELETE FROM assignment_comments
          WHERE assignment_id = ANY(${trx.array(assignmentIds)}::int[])
        `;

        // 2) Assignment downloads
        await trx`
          DELETE FROM assignment_downloads
          WHERE assignment_id = ANY(${trx.array(assignmentIds)}::int[])
        `;

        // 3) Assignment files
        await trx`
          DELETE FROM assignment_files
          WHERE assignment_id = ANY(${trx.array(assignmentIds)}::int[])
        `;

        // 4) Assignment submissions and their files
        const submissions = await trx`
          SELECT submission_id
          FROM assignment_submissions
          WHERE assignment_id = ANY(${trx.array(assignmentIds)}::int[])
        `;

        const submissionIds = submissions.map(s => s.submission_id);

        if (submissionIds.length > 0) {
          await trx`
            DELETE FROM assignment_submission_files
            WHERE submission_id = ANY(${trx.array(submissionIds)}::int[])
          `;
        }

        await trx`
          DELETE FROM assignment_submissions
          WHERE assignment_id = ANY(${trx.array(assignmentIds)}::int[])
        `;

        // Finally delete assignments themselves
        await trx`
          DELETE FROM assignments
          WHERE assignment_id = ANY(${trx.array(assignmentIds)}::int[])
        `;
      }

      // Remove lesson_files linked to these lessons
      await trx`
        DELETE FROM lesson_files
        WHERE lesson_id = ANY(${trx.array(ids)}::int[])
      `;

      // Remove progress entries linked to these lessons
      await trx`
        DELETE FROM progress
        WHERE lesson_id = ANY(${trx.array(ids)}::int[])
      `;

      // Detach quizzes that are linked to these lessons (set lesson_id to NULL)
      await trx`
        UPDATE quizzes
        SET lesson_id = NULL
        WHERE lesson_id = ANY(${trx.array(ids)}::int[])
      `;

      // Delete all lessons collected in the tree (children and main lesson)
      await trx`
        DELETE FROM lessons
        WHERE lesson_id = ANY(${trx.array(ids)}::int[])
      `;
    }

    return true;
  });
}