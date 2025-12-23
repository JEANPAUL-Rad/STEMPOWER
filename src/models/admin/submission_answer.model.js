// src/models/admin/submission_answer.model.js
import sql from '../../config/db.js';

export async function createSubmissionAnswer(data) {
  const {
    submission_id,
    question_id,
    selected_choice_id,
    file_url,
    text_answer
  } = data;

  const [result] = await sql`
    INSERT INTO submission_answers (
      submission_id,
      question_id,
      selected_choice_id,
      file_url,
      text_answer
    )
    VALUES (
      ${submission_id},
      ${question_id},
      ${selected_choice_id},
      ${file_url},
      ${text_answer}
    )
    RETURNING *;
  `;
  return result;
}

export async function listSubmissionAnswers(filters = {}) {
  let query = sql`SELECT * FROM submission_answers WHERE TRUE`;

  if (filters.submission_id) {
    query = sql`${query} AND submission_id = ${filters.submission_id}`;
  }

  if (filters.question_id) {
    query = sql`${query} AND question_id = ${filters.question_id}`;
  }

  return await query;
}

export async function getSubmissionAnswerById(answer_id) {
  const [result] = await sql`
    SELECT * FROM submission_answers WHERE answer_id = ${answer_id}
  `;
  return result;
}

export async function updateSubmissionAnswer(answer_id, data) {
  const {
    submission_id,
    question_id,
    selected_choice_id,
    file_url,
    text_answer
  } = data;

  const [result] = await sql`
    UPDATE submission_answers SET
      submission_id = COALESCE(${submission_id}, submission_id),
      question_id = COALESCE(${question_id}, question_id),
      selected_choice_id = COALESCE(${selected_choice_id}, selected_choice_id),
      file_url = COALESCE(${file_url}, file_url),
      text_answer = COALESCE(${text_answer}, text_answer)
    WHERE answer_id = ${answer_id}
    RETURNING *;
  `;
  return result;
}

export async function deleteSubmissionAnswer(answer_id) {
  return await sql.begin(async (trx) => {
    // Remove any per-answer attachments first (if FK doesn't cascade)
    await trx`
      DELETE FROM submission_answer_files
      WHERE answer_id = ${answer_id}
    `;

    await trx`
      DELETE FROM submission_answers
      WHERE answer_id = ${answer_id}
    `;
    return true;
  });
}


