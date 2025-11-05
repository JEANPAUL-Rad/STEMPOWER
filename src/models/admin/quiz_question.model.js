

import sql from '../../config/db.js';

// Get questions with pagination
export async function getQuizQuestions(quiz_id, limit = 10, offset = 0) {
  const res = await sql`
    SELECT * FROM quiz_questions 
    WHERE quiz_id = ${quiz_id}
    ORDER BY order_num ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return res;
}

// Get total count of questions for a quiz
export async function getQuizQuestionsCount(quiz_id) {
  const res = await sql`
    SELECT COUNT(*) as count FROM quiz_questions 
    WHERE quiz_id = ${quiz_id}
  `;
  return parseInt(res[0].count);
}



// Add question to quiz
export async function createQuizQuestion({ quiz_id, question_text, type, order_num, file_url }) {
  const res = await sql`
    INSERT INTO quiz_questions (quiz_id, question_text, type, order_num, file_url)
    VALUES (${quiz_id}, ${question_text}, ${type}, ${order_num}, ${file_url})
    RETURNING *
  `;
  return res[0];
}


// Update question
export async function updateQuizQuestion(question_id, { question_text, type, order_num, file_url, text_answer }) {
 // In your model (quiz_question.model.js)
const res = await sql`
  UPDATE quiz_questions SET
    question_text = COALESCE(${question_text}, question_text),
    type = COALESCE(${type}, type),
    order_num = COALESCE(${order_num}, order_num),
    file_url = COALESCE(${file_url}, file_url),
    updated_at = CURRENT_TIMESTAMP
  WHERE question_id = ${question_id}
  RETURNING *
`;
  return res[0];
}

// Delete question (and choices)
export async function deleteQuizQuestion(question_id) {
  await sql`
    DELETE FROM quiz_choices WHERE question_id = ${question_id}
  `;
  await sql`
    DELETE FROM quiz_questions WHERE question_id = ${question_id}
  `;
  return true;
}


// Get single question by ID
export async function getQuestionById(question_id) {
  const res = await sql`
    SELECT * FROM quiz_questions WHERE question_id = ${question_id}
  `;
  return res[0];
}
// Get all quiz questions
export async function getAllQuizQuestions() {
  const res = await sql`SELECT * FROM quiz_questions ORDER BY question_id ASC`;
  return res;
}
// GET all all ch
export async function getAllQuizChoices() {
  const res = await sql`SELECT * FROM quiz_choices ORDER BY choice_id ASC`;
  return res;
}


