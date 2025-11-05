import sql from '../../config/db.js';

// Create progress
export async function createProgress({ user_id, lesson_id, completed, completed_at }) {
  const [progress] = await sql`
    INSERT INTO progress (user_id, lesson_id, completed, completed_at)
    VALUES (${user_id}, ${lesson_id}, ${completed}, ${completed_at})
    RETURNING *;
  `;
  return progress;
}

// Get all progress (optionally filter by user or lesson)
export async function listProgress({ user_id, lesson_id } = {}) {
  let q = sql`SELECT * FROM progress WHERE TRUE`;
  if (user_id) q = sql`${q} AND user_id = ${user_id}`;
  if (lesson_id) q = sql`${q} AND lesson_id = ${lesson_id}`;
  return await q;
}

// Get progress by ID
export async function getProgressById(progress_id) {
  const [progress] = await sql`
    SELECT * FROM progress WHERE progress_id = ${progress_id}
  `;
  return progress;
}

// Update progress
export async function updateProgress(progress_id, { completed, completed_at }) {
  const [progress] = await sql`
    UPDATE progress SET
      completed = COALESCE(${completed}, completed),
      completed_at = COALESCE(${completed_at}, completed_at)
    WHERE progress_id = ${progress_id}
    RETURNING *;
  `;
  return progress;
}

// Delete progress
export async function deleteProgress(progress_id) {
  await sql`
    DELETE FROM progress WHERE progress_id = ${progress_id}
  `;
  return true;
}