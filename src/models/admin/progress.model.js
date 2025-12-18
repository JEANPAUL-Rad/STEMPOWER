// import sql from '../../config/db.js';

// // Create progress
// export async function createProgress({ user_id, lesson_id, completed, completed_at }) {
//   const [progress] = await sql`
//     INSERT INTO progress (user_id, lesson_id, completed, completed_at)
//     VALUES (${user_id}, ${lesson_id}, ${completed}, ${completed_at})
//     RETURNING *;
//   `;
//   return progress;
// }

// // Get all progress (optimized with pagination and JOINs for user/lesson names)
// export async function listProgress({ user_id, lesson_id, limit = 50, offset = 0 } = {}) {
//   try {
//     // Build query with JOINs to get user and lesson names in one query
//     let query = sql`
//       SELECT 
//         p.progress_id,
//         p.user_id,
//         p.lesson_id,
//         p.completed,
//         p.completed_at,
//         u.name as user_name,
//         u.email as user_email,
//         l.title as lesson_title,
//         pr.title as project_title,
//         w.module
//       FROM progress p
//       LEFT JOIN users u ON p.user_id = u.user_id
//       LEFT JOIN lessons l ON p.lesson_id = l.lesson_id
//       LEFT JOIN projects pr ON l.project_id = pr.project_id
//       LEFT JOIN weeks w ON pr.week_id = w.week_id
//       WHERE TRUE
//     `;
    
//     if (user_id) {
//       query = sql`${query} AND p.user_id = ${user_id}`;
//     }
//     if (lesson_id) {
//       query = sql`${query} AND p.lesson_id = ${lesson_id}`;
//     }
    
//     query = sql`${query} ORDER BY p.completed_at DESC NULLS LAST, p.progress_id DESC LIMIT ${limit} OFFSET ${offset}`;
    
//     return await query;
//   } catch (error) {
//     console.error('Error listing progress:', error);
//     throw error;
//   }
// }

// // Get progress by ID
// export async function getProgressById(progress_id) {
//   const [progress] = await sql`
//     SELECT * FROM progress WHERE progress_id = ${progress_id}
//   `;
//   return progress;
// }

// // Update progress
// export async function updateProgress(progress_id, { completed, completed_at }) {
//   const [progress] = await sql`
//     UPDATE progress SET
//       completed = COALESCE(${completed}, completed),
//       completed_at = COALESCE(${completed_at}, completed_at)
//     WHERE progress_id = ${progress_id}
//     RETURNING *;
//   `;
//   return progress;
// }

// // Delete progress
// export async function deleteProgress(progress_id) {
//   await sql`
//     DELETE FROM progress WHERE progress_id = ${progress_id}
//   `;
//   return true;
// }


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
export async function listProgress({ user_id, lesson_id, limit = 20, offset = 0 } = {}) {
 let q = sql`SELECT * FROM progress WHERE TRUE`;
 if (user_id !== undefined) q = sql`${q} AND user_id = ${user_id}`;
 if (lesson_id !== undefined) q = sql`${q} AND lesson_id = ${lesson_id}`;
 q = sql`${q} ORDER BY progress_id DESC LIMIT ${limit} OFFSET ${offset}`;
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

