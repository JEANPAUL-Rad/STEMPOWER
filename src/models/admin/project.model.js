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

// Delete a project
export async function deleteProject(project_id) {
    await sql`
        DELETE FROM projects WHERE project_id = ${project_id}
    `;
    return true;
}