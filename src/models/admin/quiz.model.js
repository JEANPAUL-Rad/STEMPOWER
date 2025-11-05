// // // models/admin/quiz.model.js
// // import sql from '../../config/db.js';

// // // Create a quiz, assignable to a project or lesson
// // export async function createQuiz({ title, description, project_id, lesson_id, time_limit, start_time, end_time }) {
// //   const res = await sql`
// //     INSERT INTO quizzes (title, description, project_id, lesson_id, time_limit, start_time, end_time)
// //     VALUES (
// //       ${title},
// //       ${description},
// //       ${project_id || null},
// //       ${lesson_id || null},
// //       ${time_limit || null},
// //       ${start_time ? start_time : null},
// //       ${end_time ? end_time : null}
// //     )
// //     RETURNING *
// //   `;
// //   return res[0];
// // }

// // // List quizzes, optionally filter by project or lesson
// // export async function getAllQuizzes({ project_id = null, lesson_id = null } = {}) {
// //   let whereConditions = [];
// //   let params = [];
  
// //   if (project_id !== null && project_id !== '') {
// //     whereConditions.push(`project_id = $${params.length + 1}`);
// //     params.push(project_id);
// //   }
  
// //   if (lesson_id !== null && lesson_id !== '') {
// //     whereConditions.push(`lesson_id = $${params.length + 1}`);
// //     params.push(lesson_id);
// //   }
  
// //   const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
// //   const query = `
// //     SELECT * FROM quizzes
// //     ${whereClause}
// //     ORDER BY created_at DESC
// //   `;
  
// //   const res = await sql.unsafe(query, params);
// //   return res;
// // }

// // // Get quiz by ID
// // export async function getQuizById(quiz_id) {
// //   const res = await sql`
// //     SELECT * FROM quizzes WHERE quiz_id = ${quiz_id}
// //   `;
// //   return res[0];
// // }

// // // Update quiz
// // export async function updateQuiz(quiz_id, { title, description, project_id, lesson_id, time_limit, start_time, end_time }) {
// //   // Build dynamic update query
// //   const updates = [];
// //   const params = [];
// //   let paramIndex = 1;
  
// //   if (title !== undefined) {
// //     updates.push(`title = $${paramIndex++}`);
// //     params.push(title);
// //   }
  
// //   if (description !== undefined) {
// //     updates.push(`description = $${paramIndex++}`);
// //     params.push(description);
// //   }
  
// //   if (project_id !== undefined) {
// //     updates.push(`project_id = $${paramIndex++}`);
// //     params.push(project_id || null);
// //   }
  
// //   if (lesson_id !== undefined) {
// //     updates.push(`lesson_id = $${paramIndex++}`);
// //     params.push(lesson_id || null);
// //   }
  
// //   if (time_limit !== undefined) {
// //     updates.push(`time_limit = $${paramIndex++}`);
// //     params.push(time_limit || null);
// //   }
  
// //   if (start_time !== undefined) {
// //     updates.push(`start_time = $${paramIndex++}`);
// //     params.push(start_time);
// //   }
  
// //   if (end_time !== undefined) {
// //     updates.push(`end_time = $${paramIndex++}`);
// //     params.push(end_time);
// //   }
  
// //   if (updates.length === 0) {
// //     // No updates provided, return existing quiz
// //     return await getQuizById(quiz_id);
// //   }
  
// //   updates.push(`updated_at = CURRENT_TIMESTAMP`);
// //   params.push(quiz_id);
  
// //   const query = `
// //     UPDATE quizzes SET
// //     ${updates.join(', ')}
// //     WHERE quiz_id = $${paramIndex}
// //     RETURNING *
// //   `;
  
// //   const res = await sql.unsafe(query, params);
// //   return res[0];
// // }

// // // Delete quiz
// // export async function deleteQuiz(quiz_id) {
// //   await sql`
// //     DELETE FROM quizzes WHERE quiz_id = ${quiz_id}
// //   `;
// //   return true;
// // }


// // models/admin/quiz.model.js - ENHANCED VERSION
// import sql from '../../config/db.js';

// // Create a quiz with enhanced settings
// export async function createQuiz({
//   title,
//   description,
//   project_id,
//   lesson_id,
//   time_limit,
//   start_time,
//   end_time,
//   // NEW: Enhanced settings
//   auto_start = true,
//   auto_submit = true,
//   grace_period = 5,
//   max_attempts = 1,
//   shuffle_questions = false,
//   show_results_immediately = false,
//   allow_navigation = true
// }) {
//   const res = await sql`
//     INSERT INTO quizzes (
//       title,
//       description,
//       project_id,
//       lesson_id,
//       time_limit,
//       start_time,
//       end_time,
//       auto_start,
//       auto_submit,
//       grace_period,
//       max_attempts,
//       shuffle_questions,
//       show_results_immediately,
//       allow_navigation,
//       status
//     )
//     VALUES (
//       ${title},
//       ${description},
//       ${project_id || null},
//       ${lesson_id || null},
//       ${time_limit || null},
//       ${start_time ? start_time : null},
//       ${end_time ? end_time : null},
//       ${auto_start},
//       ${auto_submit},
//       ${grace_period},
//       ${max_attempts},
//       ${shuffle_questions},
//       ${show_results_immediately},
//       ${allow_navigation},
//       'scheduled'
//     )
//     RETURNING *
//   `;
//   return res[0];
// }

// // List quizzes with enhanced filtering
// export async function getAllQuizzes({ project_id = null, lesson_id = null, status = null } = {}) {
//   let whereConditions = [];
//   let params = [];
  
//   if (project_id !== null && project_id !== '') {
//     whereConditions.push(`project_id = $${params.length + 1}`);
//     params.push(project_id);
//   }
  
//   if (lesson_id !== null && lesson_id !== '') {
//     whereConditions.push(`lesson_id = $${params.length + 1}`);
//     params.push(lesson_id);
//   }

//   if (status !== null && status !== '') {
//     whereConditions.push(`status = $${params.length + 1}`);
//     params.push(status);
//   }
  
//   const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
//   const query = `
//     SELECT * FROM quizzes
//     ${whereClause}
//     ORDER BY created_at DESC
//   `;
  
//   const res = await sql.unsafe(query, params);
//   return res;
// }

// // Get quiz by ID
// export async function getQuizById(quiz_id) {
//   const res = await sql`
//     SELECT * FROM quizzes WHERE quiz_id = ${quiz_id}
//   `;
//   return res[0];
// }

// // Update quiz with enhanced settings
// export async function updateQuiz(quiz_id, {
//   title,
//   description,
//   project_id,
//   lesson_id,
//   time_limit,
//   start_time,
//   end_time,
//   auto_start,
//   auto_submit,
//   grace_period,
//   max_attempts,
//   shuffle_questions,
//   show_results_immediately,
//   allow_navigation
// }) {
//   const updates = [];
//   const params = [];
//   let paramIndex = 1;
  
//   if (title !== undefined) {
//     updates.push(`title = $${paramIndex++}`);
//     params.push(title);
//   }
  
//   if (description !== undefined) {
//     updates.push(`description = $${paramIndex++}`);
//     params.push(description);
//   }
  
//   if (project_id !== undefined) {
//     updates.push(`project_id = $${paramIndex++}`);
//     params.push(project_id || null);
//   }
  
//   if (lesson_id !== undefined) {
//     updates.push(`lesson_id = $${paramIndex++}`);
//     params.push(lesson_id || null);
//   }
  
//   if (time_limit !== undefined) {
//     updates.push(`time_limit = $${paramIndex++}`);
//     params.push(time_limit || null);
//   }
  
//   if (start_time !== undefined) {
//     updates.push(`start_time = $${paramIndex++}`);
//     params.push(start_time);
//   }
  
//   if (end_time !== undefined) {
//     updates.push(`end_time = $${paramIndex++}`);
//     params.push(end_time);
//   }

//   // NEW: Enhanced settings updates
//   if (auto_start !== undefined) {
//     updates.push(`auto_start = $${paramIndex++}`);
//     params.push(auto_start);
//   }

//   if (auto_submit !== undefined) {
//     updates.push(`auto_submit = $${paramIndex++}`);
//     params.push(auto_submit);
//   }

//   if (grace_period !== undefined) {
//     updates.push(`grace_period = $${paramIndex++}`);
//     params.push(grace_period);
//   }

//   if (max_attempts !== undefined) {
//     updates.push(`max_attempts = $${paramIndex++}`);
//     params.push(max_attempts);
//   }

//   if (shuffle_questions !== undefined) {
//     updates.push(`shuffle_questions = $${paramIndex++}`);
//     params.push(shuffle_questions);
//   }

//   if (show_results_immediately !== undefined) {
//     updates.push(`show_results_immediately = $${paramIndex++}`);
//     params.push(show_results_immediately);
//   }

//   if (allow_navigation !== undefined) {
//     updates.push(`allow_navigation = $${paramIndex++}`);
//     params.push(allow_navigation);
//   }
  
//   if (updates.length === 0) {
//     return await getQuizById(quiz_id);
//   }
  
//   updates.push(`updated_at = CURRENT_TIMESTAMP`);
//   params.push(quiz_id);
  
//   const query = `
//     UPDATE quizzes SET
//     ${updates.join(', ')}
//     WHERE quiz_id = $${paramIndex}
//     RETURNING *
//   `;
  
//   const res = await sql.unsafe(query, params);
//   return res[0];
// }

// // Delete quiz
// export async function deleteQuiz(quiz_id) {
//   await sql`
//     DELETE FROM quizzes WHERE quiz_id = ${quiz_id}
//   `;
//   return true;
// }

// // NEW: Quiz session management functions
// export async function createQuizSession({ quiz_id, user_id, started_at }) {
//   const res = await sql`
//     INSERT INTO quiz_sessions (quiz_id, user_id, started_at, session_data)
//     VALUES (${quiz_id}, ${user_id}, ${started_at}, '{}')
//     RETURNING *
//   `;
//   return res[0];
// }

// export async function getActiveQuizSessions(quiz_id) {
//   const res = await sql`
//     SELECT qs.*, u.name as student_name
//     FROM quiz_sessions qs
//     JOIN users u ON qs.user_id = u.user_id
//     WHERE qs.quiz_id = ${quiz_id}
//     AND qs.submitted_at IS NULL
//     ORDER BY qs.started_at DESC
//   `;
//   return res;
// }

// export async function getQuizSessionById(session_id) {
//   const res = await sql`
//     SELECT * FROM quiz_sessions WHERE session_id = ${session_id}
//   `;
//   return res[0];
// }

// export async function updateQuizSession(session_id, updates) {
//   const { session_data, time_remaining, submitted_at, auto_submitted, final_score } = updates;
  
//   const updateFields = [];
//   const params = [];
//   let paramIndex = 1;

//   if (session_data !== undefined) {
//     updateFields.push(`session_data = $${paramIndex++}`);
//     params.push(JSON.stringify(session_data));
//   }

//   if (time_remaining !== undefined) {
//     updateFields.push(`time_remaining = $${paramIndex++}`);
//     params.push(time_remaining);
//   }

//   if (submitted_at !== undefined) {
//     updateFields.push(`submitted_at = $${paramIndex++}`);
//     params.push(submitted_at);
//   }

//   if (auto_submitted !== undefined) {
//     updateFields.push(`auto_submitted = $${paramIndex++}`);
//     params.push(auto_submitted);
//   }

//   if (final_score !== undefined) {
//     updateFields.push(`final_score = $${paramIndex++}`);
//     params.push(final_score);
//   }

//   if (updateFields.length === 0) return null;

//   updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
//   params.push(session_id);

//   const query = `
//     UPDATE quiz_sessions SET
//     ${updateFields.join(', ')}
//     WHERE session_id = $${paramIndex}
//     RETURNING *
//   `;

//   const res = await sql.unsafe(query, params);
//   return res[0];
// }

// // NEW: Quiz control functions
// export async function updateQuizStatus(quiz_id, status) {
//   const res = await sql`
//     UPDATE quizzes
//     SET status = ${status}, updated_at = CURRENT_TIMESTAMP
//     WHERE quiz_id = ${quiz_id}
//     RETURNING *
//   `;
//   return res[0];
// }

// export async function forceStartQuiz(quiz_id) {
//   const res = await sql`
//     UPDATE quizzes
//     SET status = 'active', start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
//     WHERE quiz_id = ${quiz_id}
//     RETURNING *
//   `;
//   return res[0];
// }

// export async function forceEndQuiz(quiz_id) {
//   // End the quiz
//   const quiz = await sql`
//     UPDATE quizzes
//     SET status = 'completed', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
//     WHERE quiz_id = ${quiz_id}
//     RETURNING *
//   `;

//   // Auto-submit all active sessions
//   await sql`
//     UPDATE quiz_sessions
//     SET submitted_at = CURRENT_TIMESTAMP, auto_submitted = true
//     WHERE quiz_id = ${quiz_id} AND submitted_at IS NULL
//   `;

//   return quiz[0];
// }

// // NEW: Get live quiz statistics
// export async function getQuizLiveStats(quiz_id) {
//   const stats = await sql`
//     SELECT
//       COUNT(*) FILTER (WHERE submitted_at IS NULL) as active_sessions,
//       COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) as completed_sessions,
//       AVG(
//         CASE
//           WHEN submitted_at IS NULL AND session_data != '{}'
//           THEN (jsonb_array_length(session_data::jsonb->'answers') * 100.0 /
//                 (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = ${quiz_id}))
//           ELSE NULL
//         END
//       ) as average_progress
//     FROM quiz_sessions
//     WHERE quiz_id = ${quiz_id}
//   `;

//   return stats[0];
// }

// // NEW: Get quizzes that should change status
// export async function getQuizzesToStart() {
//   const res = await sql`
//     SELECT * FROM quizzes
//     WHERE status = 'scheduled'
//     AND start_time <= CURRENT_TIMESTAMP
//     AND auto_start = true
//   `;
//   return res;
// }

// export async function getQuizzesToEnd() {
//   const res = await sql`
//     SELECT * FROM quizzes
//     WHERE status = 'active'
//     AND end_time <= CURRENT_TIMESTAMP
//     AND auto_submit = true
//   `;
//   return res;
// }

// export async function getExpiredSessions() {
//   const res = await sql`
//     SELECT qs.*, q.time_limit, q.grace_period
//     FROM quiz_sessions qs
//     JOIN quizzes q ON qs.quiz_id = q.quiz_id
//     WHERE qs.submitted_at IS NULL
//     AND (
//       EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - qs.started_at)) / 60
//       > (q.time_limit + COALESCE(q.grace_period, 0))
//     )
//   `;
//   return res;
// }


// models/admin/quiz.model.js - UPDATED WITH POSTGRESQL TIMEZONE SUPPORT
import sql from '../../config/db.js';

// IMPROVED: Create quiz with PostgreSQL timezone handling
export async function createQuiz({ 
  title, 
  description, 
  project_id, 
  lesson_id, 
  time_limit, 
  start_time, 
  end_time,
  marks = 100,
  auto_start = true,
  auto_submit = true,
  grace_period = 5,
  max_attempts = 1,
  shuffle_questions = false,
  show_results_immediately = false,
  allow_navigation = true,
  timezone = 'Africa/Kigali'
}) {
  const res = await sql`
    INSERT INTO quizzes (
      title, 
      description, 
      project_id, 
      lesson_id, 
      time_limit, 
      start_time, 
      end_time,
      marks,
      auto_start,
      auto_submit,
      grace_period,
      max_attempts,
      shuffle_questions,
      show_results_immediately,
      allow_navigation,
      status
    )
    VALUES (
      ${title}, 
      ${description}, 
      ${project_id || null}, 
      ${lesson_id || null}, 
      ${time_limit || null}, 
      ${start_time ? sql`(${start_time}::timestamp AT TIME ZONE ${timezone})::timestamptz` : null}, 
      ${end_time ? sql`(${end_time}::timestamp AT TIME ZONE ${timezone})::timestamptz` : null},
      ${marks},
      ${auto_start},
      ${auto_submit},
      ${grace_period},
      ${max_attempts},
      ${shuffle_questions},
      ${show_results_immediately},
      ${allow_navigation},
      'scheduled'
    )
    RETURNING 
      *,
      start_time AT TIME ZONE ${timezone} as start_time_local,
      end_time AT TIME ZONE ${timezone} as end_time_local,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'YYYY-MM-DD"T"HH24:MI') as start_time_input,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'YYYY-MM-DD"T"HH24:MI') as end_time_input,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as end_time_display
  `;
  return res[0];
}

// IMPROVED: Get all quizzes with timezone conversion
export async function getAllQuizzes({ 
  project_id = null, 
  lesson_id = null, 
  status = null, 
  timezone = 'Africa/Kigali' 
} = {}) {
  let whereConditions = [];
  let params = [timezone]; // First parameter is timezone
  
  if (project_id !== null && project_id !== '') {
    whereConditions.push(`project_id = $${params.length + 1}`);
    params.push(project_id);
  }
  
  if (lesson_id !== null && lesson_id !== '') {
    whereConditions.push(`lesson_id = $${params.length + 1}`);
    params.push(lesson_id);
  }

  if (status !== null && status !== '') {
    whereConditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const query = `
    SELECT *,
      start_time AT TIME ZONE $1 as start_time_local,
      end_time AT TIME ZONE $1 as end_time_local,
      TO_CHAR(start_time AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') as start_time_input,
      TO_CHAR(end_time AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') as end_time_input,
      TO_CHAR(start_time AT TIME ZONE $1, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE $1, 'DD/MM/YYYY HH24:MI') as end_time_display,
      CASE 
        WHEN NOW() < start_time THEN 'scheduled'
        WHEN NOW() >= start_time AND NOW() <= end_time THEN 'active'
        WHEN NOW() > end_time THEN 'completed'
        ELSE status
      END as computed_status
    FROM quizzes 
    ${whereClause}
    ORDER BY created_at DESC
  `;
  
  const res = await sql.unsafe(query, params);
  return res;
}

// IMPROVED: Get quiz by ID with timezone conversion
export async function getQuizById(quiz_id, timezone = 'Africa/Kigali') {
  const res = await sql`
    SELECT *,
      start_time AT TIME ZONE ${timezone} as start_time_local,
      end_time AT TIME ZONE ${timezone} as end_time_local,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'YYYY-MM-DD"T"HH24:MI') as start_time_input,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'YYYY-MM-DD"T"HH24:MI') as end_time_input,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as end_time_display,
      CASE 
        WHEN NOW() < start_time THEN 'scheduled'
        WHEN NOW() >= start_time AND NOW() <= end_time THEN 'active'
        WHEN NOW() > end_time THEN 'completed'
        ELSE status
      END as computed_status
    FROM quizzes 
    WHERE quiz_id = ${quiz_id}
  `;
  return res[0];
}

// IMPROVED: Update quiz with timezone handling
export async function updateQuiz(quiz_id, updateData, timezone = 'Africa/Kigali') {
  const updates = [];
  const params = [timezone]; // First parameter is timezone
  let paramIndex = 2; // Start from 2 since timezone is $1
  
  if (updateData.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(updateData.title);
  }
  
  if (updateData.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(updateData.description);
  }
  
  if (updateData.project_id !== undefined) {
    updates.push(`project_id = $${paramIndex++}`);
    params.push(updateData.project_id || null);
  }
  
  if (updateData.lesson_id !== undefined) {
    updates.push(`lesson_id = $${paramIndex++}`);
    params.push(updateData.lesson_id || null);
  }
  
  if (updateData.time_limit !== undefined) {
    updates.push(`time_limit = $${paramIndex++}`);
    params.push(updateData.time_limit || null);
  }
  
  // IMPROVED: Handle start_time with timezone conversion
  if (updateData.start_time !== undefined) {
    updates.push(`start_time = ($${paramIndex++}::timestamp AT TIME ZONE $1)::timestamptz`);
    params.push(updateData.start_time);
  }
  
  // IMPROVED: Handle end_time with timezone conversion
  if (updateData.end_time !== undefined) {
    updates.push(`end_time = ($${paramIndex++}::timestamp AT TIME ZONE $1)::timestamptz`);
    params.push(updateData.end_time);
  }

  // Handle marks field
  if (updateData.marks !== undefined) {
    updates.push(`marks = $${paramIndex++}`);
    params.push(updateData.marks);
  }

  // Enhanced settings updates
  if (updateData.auto_start !== undefined) {
    updates.push(`auto_start = $${paramIndex++}`);
    params.push(updateData.auto_start);
  }

  if (updateData.auto_submit !== undefined) {
    updates.push(`auto_submit = $${paramIndex++}`);
    params.push(updateData.auto_submit);
  }

  if (updateData.grace_period !== undefined) {
    updates.push(`grace_period = $${paramIndex++}`);
    params.push(updateData.grace_period);
  }

  if (updateData.max_attempts !== undefined) {
    updates.push(`max_attempts = $${paramIndex++}`);
    params.push(updateData.max_attempts);
  }

  if (updateData.shuffle_questions !== undefined) {
    updates.push(`shuffle_questions = $${paramIndex++}`);
    params.push(updateData.shuffle_questions);
  }

  if (updateData.show_results_immediately !== undefined) {
    updates.push(`show_results_immediately = $${paramIndex++}`);
    params.push(updateData.show_results_immediately);
  }

  if (updateData.allow_navigation !== undefined) {
    updates.push(`allow_navigation = $${paramIndex++}`);
    params.push(updateData.allow_navigation);
  }
  
  if (updates.length === 0) {
    return await getQuizById(quiz_id, timezone);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(quiz_id);
  
  const query = `
    UPDATE quizzes SET 
    ${updates.join(', ')}
    WHERE quiz_id = $${paramIndex}
    RETURNING *,
      start_time AT TIME ZONE $1 as start_time_local,
      end_time AT TIME ZONE $1 as end_time_local,
      TO_CHAR(start_time AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') as start_time_input,
      TO_CHAR(end_time AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') as end_time_input,
      TO_CHAR(start_time AT TIME ZONE $1, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE $1, 'DD/MM/YYYY HH24:MI') as end_time_display
  `;
  
  const res = await sql.unsafe(query, params);
  return res[0];
}

// Delete quiz (unchanged)
export async function deleteQuiz(quiz_id) {
  await sql`
    DELETE FROM quizzes WHERE quiz_id = ${quiz_id}
  `;
  return true;
}

// Quiz session management functions (unchanged)
export async function createQuizSession({ quiz_id, user_id, started_at }) {
  const res = await sql`
    INSERT INTO quiz_sessions (quiz_id, user_id, started_at, session_data)
    VALUES (${quiz_id}, ${user_id}, ${started_at}, '{}')
    RETURNING *
  `;
  return res[0];
}

export async function getActiveQuizSessions(quiz_id) {
  const res = await sql`
    SELECT qs.*, u.name as student_name
    FROM quiz_sessions qs
    JOIN users u ON qs.user_id = u.user_id
    WHERE qs.quiz_id = ${quiz_id} 
    AND qs.submitted_at IS NULL
    ORDER BY qs.started_at DESC
  `;
  return res;
}

export async function getQuizSessionById(session_id) {
  const res = await sql`
    SELECT * FROM quiz_sessions WHERE session_id = ${session_id}
  `;
  return res[0];
}

export async function updateQuizSession(session_id, updates) {
  const { session_data, time_remaining, submitted_at, auto_submitted, final_score } = updates;
  
  const updateFields = [];
  const params = [];
  let paramIndex = 1;

  if (session_data !== undefined) {
    updateFields.push(`session_data = $${paramIndex++}`);
    params.push(JSON.stringify(session_data));
  }

  if (time_remaining !== undefined) {
    updateFields.push(`time_remaining = $${paramIndex++}`);
    params.push(time_remaining);
  }

  if (submitted_at !== undefined) {
    updateFields.push(`submitted_at = $${paramIndex++}`);
    params.push(submitted_at);
  }

  if (auto_submitted !== undefined) {
    updateFields.push(`auto_submitted = $${paramIndex++}`);
    params.push(auto_submitted);
  }

  if (final_score !== undefined) {
    updateFields.push(`final_score = $${paramIndex++}`);
    params.push(final_score);
  }

  if (updateFields.length === 0) return null;

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(session_id);

  const query = `
    UPDATE quiz_sessions SET 
    ${updateFields.join(', ')}
    WHERE session_id = $${paramIndex}
    RETURNING *
  `;

  const res = await sql.unsafe(query, params);
  return res[0];
}

// IMPROVED: Quiz control functions with timezone support
export async function updateQuizStatus(quiz_id, status, timezone = 'Africa/Kigali') {
  const res = await sql`
    UPDATE quizzes 
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE quiz_id = ${quiz_id}
    RETURNING *,
      start_time AT TIME ZONE ${timezone} as start_time_local,
      end_time AT TIME ZONE ${timezone} as end_time_local,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as end_time_display
  `;
  return res[0];
}

export async function forceStartQuiz(quiz_id, timezone = 'Africa/Kigali') {
  const res = await sql`
    UPDATE quizzes 
    SET status = 'active', start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE quiz_id = ${quiz_id}
    RETURNING *,
      start_time AT TIME ZONE ${timezone} as start_time_local,
      end_time AT TIME ZONE ${timezone} as end_time_local,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as end_time_display
  `;
  return res[0];
}

export async function forceEndQuiz(quiz_id, timezone = 'Africa/Kigali') {
  // End the quiz
  const quiz = await sql`
    UPDATE quizzes 
    SET status = 'completed', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE quiz_id = ${quiz_id}
    RETURNING *,
      start_time AT TIME ZONE ${timezone} as start_time_local,
      end_time AT TIME ZONE ${timezone} as end_time_local,
      TO_CHAR(start_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as start_time_display,
      TO_CHAR(end_time AT TIME ZONE ${timezone}, 'DD/MM/YYYY HH24:MI') as end_time_display
  `;

  // Auto-submit all active sessions
  await sql`
    UPDATE quiz_sessions 
    SET submitted_at = CURRENT_TIMESTAMP, auto_submitted = true
    WHERE quiz_id = ${quiz_id} AND submitted_at IS NULL
  `;

  return quiz[0];
}

// Get live quiz statistics (unchanged)
export async function getQuizLiveStats(quiz_id) {
  const stats = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE submitted_at IS NULL) as active_sessions,
      COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) as completed_sessions,
      AVG(
        CASE 
          WHEN submitted_at IS NULL AND session_data != '{}' 
          THEN (jsonb_array_length(session_data::jsonb->'answers') * 100.0 / 
                (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = ${quiz_id}))
          ELSE NULL 
        END
      ) as average_progress
    FROM quiz_sessions 
    WHERE quiz_id = ${quiz_id}
  `;

  return stats[0];
}

// IMPROVED: Timezone-aware scheduled quiz functions
export async function getQuizzesToStart() {
  const res = await sql`
    SELECT * FROM quizzes 
    WHERE status = 'scheduled' 
    AND start_time <= CURRENT_TIMESTAMP
    AND auto_start = true
  `;
  return res;
}

export async function getQuizzesToEnd() {
  const res = await sql`
    SELECT * FROM quizzes 
    WHERE status = 'active' 
    AND end_time <= CURRENT_TIMESTAMP
    AND auto_submit = true
  `;
  return res;
}

export async function getExpiredSessions() {
  const res = await sql`
    SELECT qs.*, q.time_limit, q.grace_period
    FROM quiz_sessions qs
    JOIN quizzes q ON qs.quiz_id = q.quiz_id
    WHERE qs.submitted_at IS NULL
    AND (
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - qs.started_at)) / 60 
      > (q.time_limit + COALESCE(q.grace_period, 0))
    )
  `;
  return res;
}