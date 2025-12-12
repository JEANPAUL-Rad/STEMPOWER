import sql from '../../config/db.js';

// Create a project (assign to week)
// Create a project with rich content support
export async function createProject({ title, short_description, image_url, video_url, week_id, order_num }) {
    const [project] = await sql`
        INSERT INTO projects (title, short_description, image_url, video_url, week_id, order_num)
        VALUES (${title}, ${short_description}, ${image_url}, ${video_url}, ${week_id}, ${order_num})
        RETURNING *
    `;
    return project;
}

// List all projects (optionally filter by week)
export async function getAllProjects({ week_id = null } = {}) {
    let projects;
    if (week_id) {
        projects = await sql`
            SELECT * FROM projects
            WHERE week_id = ${week_id}
            ORDER BY order_num ASC, created_at ASC
        `;
    } else {
        projects = await sql`
            SELECT * FROM projects
            ORDER BY order_num ASC, created_at ASC
        `;
    }
    return projects;
}

// Get project details by ID
export async function getProjectById(project_id) {
    const [project] = await sql`
        SELECT * FROM projects WHERE project_id = ${project_id}
    `;
    return project;
}

// Update a project
export async function updateProject(
    project_id,
    { title, short_description, image_url, video_url, week_id, order_num }
  ) {
      const [project] = await sql`
          UPDATE projects SET
              title = COALESCE(${title}, title),
              short_description = COALESCE(${short_description}, short_description),
              image_url = COALESCE(${image_url}, image_url),
              video_url = COALESCE(${video_url}, video_url),
              week_id = COALESCE(${week_id}, week_id),
              order_num = COALESCE(${order_num}, order_num),
              updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ${project_id}
          RETURNING *
      `;
      return project;
  }

// Delete a project with safe cascade of linked lessons and their data
export async function deleteProject(project_id) {
    await sql.begin(async (trx) => {
        // Collect all lessons under this project
        const lessons = await trx`
            SELECT lesson_id FROM lessons WHERE project_id = ${project_id}::int
        `;
        const lessonIds = lessons.map(l => l.lesson_id);

        if (lessonIds.length > 0) {
            // Collect assignments linked to these lessons
            const assignments = await trx`
                SELECT assignment_id FROM assignments
                WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
            `;
            const assignmentIds = assignments.map(a => a.assignment_id);

            // Remove assignment-related data in proper dependency order
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

            // Finally delete the lessons
            await trx`
                DELETE FROM lessons
                WHERE lesson_id = ANY(${trx.array(lessonIds)}::int[])
            `;
        }

        // Delete the project itself
        await trx`
            DELETE FROM projects WHERE project_id = ${project_id}::int
        `;
    });

    return true;
}