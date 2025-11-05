

import sql from '../../config/db.js';

// Get choices for a question
export async function getQuestionChoices(question_id) {
  const res = await sql`
    SELECT * FROM quiz_choices 
    WHERE question_id = ${question_id}
    ORDER BY choice_id ASC
  `;
  return res;
}

// Create choice
export async function createQuizChoice({ question_id, choice_text, is_correct }) {
  const res = await sql`
    INSERT INTO quiz_choices (question_id, choice_text, is_correct)
    VALUES (${question_id}, ${choice_text}, ${is_correct})
    RETURNING *
  `;
  return res[0];
}

// Update choice
export async function updateQuizChoice(choice_id, { choice_text, is_correct }) {
  const res = await sql`
    UPDATE quiz_choices SET
      choice_text = COALESCE(${choice_text}, choice_text),
      is_correct = COALESCE(${is_correct}, is_correct)
    WHERE choice_id = ${choice_id}
    RETURNING *
  `;
  return res[0];
}

// Delete choice
export async function deleteQuizChoice(choice_id) {
  await sql`
    DELETE FROM quiz_choices WHERE choice_id = ${choice_id}
  `;
  return true;
}

// Delete all choices for a question
export async function deleteQuestionChoices(question_id) {
  await sql`
    DELETE FROM quiz_choices WHERE question_id = ${question_id}
  `;
  return true;
}

// GET all 
export async function getAllQuizChoices() {
  const res = await sql`SELECT * FROM quiz_choices ORDER BY choice_id ASC`;
  return res;
}

export async function findQuizChoiceById(choice_id) {
  const res = await sql`
    SELECT * FROM quiz_choices
    WHERE choice_id = ${choice_id}
    LIMIT 1
  `;
  return res[0];
}




