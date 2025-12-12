import sql from '../../config/db.js';

// Create a week
export async function createWeek({ title, description, order_num, module }) {
  const res = await sql`
    INSERT INTO weeks (title, description, order_num, module)
    VALUES (${title}, ${description}, ${order_num}, ${module || null})
    RETURNING *
  `;
  return res[0];
}

// Get all weeks
export async function getAllWeeks() {
  const res = await sql`
    SELECT * FROM weeks ORDER BY order_num ASC, created_at ASC
  `;
  return res;
}

// Get week by ID
export async function getWeekById(week_id) {
  const res = await sql`
    SELECT * FROM weeks WHERE week_id = ${week_id}
  `;
  return res[0];
}

// Update week
export async function updateWeek(week_id, { title, description, order_num, module }) {
  const res = await sql`
    UPDATE weeks SET
      title = COALESCE(${title}, title),
      description = COALESCE(${description}, description),
      order_num = COALESCE(${order_num}, order_num),
      module = COALESCE(${module}, module),
      updated_at = CURRENT_TIMESTAMP
    WHERE week_id = ${week_id}
    RETURNING *
  `;
  return res[0];
}

// Delete week with safe cascade of projects and their lessons/data
export async function deleteWeek(week_id) {
  await sql.begin(async (trx) => {
    // Collect all projects under this week
    const projects = await trx`
      SELECT project_id FROM projects WHERE week_id = ${week_id}::int
    `;
    const projectIds = projects.map(p => p.project_id);

    if (projectIds.length > 0) {
      // Collect all lessons under these projects
      const lessons = await trx`
        SELECT lesson_id FROM lessons WHERE project_id = ANY(${trx.array(projectIds)}::int[])
      `;
      const lessonIds = lessons.map(l => l.lesson_id);

      if (lessonIds.length > 0) {
        // Collect assignments linked to these lessons
        const assignments = await trx`
          SELECT assignment_id FROM assignments
          WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
        `;
        const assignmentIds = assignments.map(a => a.assignment_id);

        // Delete assignment-related data in proper dependency order
        if (assignmentIds.length > 0) {
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

        // Remove lesson files
        await trx`
          DELETE FROM lesson_files
          WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
        `;

        // Remove progress entries
        await trx`
          DELETE FROM progress
          WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
        `;

        // Detach quizzes linked to these lessons
        await trx`
          UPDATE quizzes
          SET lesson_id = NULL
          WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
        `;

        // Delete lessons
        await trx`
          DELETE FROM lessons
          WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
        `;
      }

      // Delete projects
      await trx`
        DELETE FROM projects
        WHERE project_id = ANY(${trx.array(projectIds)}::int[])
      `;
    }

    // Finally delete the week
    await trx`
      DELETE FROM weeks WHERE week_id = ${week_id}::int
    `;
  });

  return true;
}