import sql from '../../config/db.js';

export async function addQuizQuestionFile({ question_id, file_url, file_name = null, file_type = null, uploaded_by = null }) {
  const [row] = await sql`
    INSERT INTO quiz_question_files (question_id, file_url, file_name, file_type, uploaded_by, uploaded_at)
    VALUES (${question_id}, ${file_url}, ${file_name}, ${file_type}, ${uploaded_by}, NOW())
    RETURNING *;
  `;
  return row;
}

export async function getFilesByQuestionId(question_id) {
  return await sql`SELECT * FROM quiz_question_files WHERE question_id = ${question_id} ORDER BY uploaded_at ASC`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM quiz_question_files WHERE file_id = ${file_id}`;
  return true;
}

export async function addQuizQuestionFiles(question_id, files, uploaded_by = null) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const inserted = [];
  for (const f of files) {
    const [row] = await sql`
      INSERT INTO quiz_question_files (question_id, file_url, file_name, file_type, uploaded_by, uploaded_at)
      VALUES (${question_id}, ${f.url || f.file_url}, ${f.name || f.file_name || null}, ${f.type || f.file_type || null}, ${uploaded_by}, NOW())
      RETURNING *
    `;
    inserted.push(row);
  }
  return inserted;
}






