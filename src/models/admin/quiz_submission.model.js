


import sql from '../../config/db.js';

// Create quiz submission (this one is correct)
export async function createQuizSubmission({ quiz_id, user_id, submitted_at, score, admin_comment, reviewed }) {
  const [submission] = await sql`
    INSERT INTO quiz_submissions (quiz_id, user_id, submitted_at, score, admin_comment, reviewed)
    VALUES (${quiz_id}, ${user_id}, ${submitted_at}, ${score}, ${admin_comment}, ${reviewed})
    RETURNING *;
  `;
  return submission;
}

// List all quiz submissions (this one is correct)
export async function listQuizSubmissions({ quiz_id, user_id } = {}) {
  let q = sql`SELECT * FROM quiz_submissions WHERE TRUE`;
  if (quiz_id) q = sql`${q} AND quiz_id = ${quiz_id}`;
  if (user_id) q = sql`${q} AND user_id = ${user_id}`;
  q = sql`${q} ORDER BY submitted_at DESC`;
  return await q;
}

// FIXED: Use submission_id (not id)
export async function getQuizSubmissionById(submission_id) {
  const [submission] = await sql`
    SELECT * FROM quiz_submissions WHERE submission_id = ${submission_id}
  `;
  return submission;
}

// FIXED: Use submission_id (not id)
export async function updateQuizSubmission(submission_id, { score, admin_comment, reviewed }) {
  const [submission] = await sql`
    UPDATE quiz_submissions SET 
      score = COALESCE(${score}, score),
      admin_comment = COALESCE(${admin_comment}, admin_comment),
      reviewed = COALESCE(${reviewed}, reviewed)
    WHERE submission_id = ${submission_id}
    RETURNING *;
  `;
  return submission;
}

// FIXED: Use submission_id (not id)
export async function deleteQuizSubmission(submission_id) {
  await sql`
    DELETE FROM quiz_submissions WHERE submission_id = ${submission_id}
  `;
  return true;
}

