import sql from '../../config/db.js';

export async function addSubmissionAnswerFile({ answer_id, file_url, file_name = null, file_type = null, file_size_bytes = null, uploaded_by = null }) {
  const [row] = await sql`
    INSERT INTO submission_answer_files (answer_id, file_url, file_name, file_type, file_size_bytes, uploaded_by, uploaded_at)
    VALUES (${answer_id}, ${file_url}, ${file_name}, ${file_type}, ${file_size_bytes}, ${uploaded_by}, NOW())
    RETURNING *;
  `;
  return row;
}

export async function getFilesByAnswerId(answer_id) {
  return await sql`SELECT * FROM submission_answer_files WHERE answer_id = ${answer_id} ORDER BY uploaded_at ASC`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM submission_answer_files WHERE file_id = ${file_id}`;
  return true;
}

export async function addSubmissionAnswerFiles(answer_id, files, uploaded_by = null) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const inserted = [];
  for (const f of files) {
    const [row] = await sql`
      INSERT INTO submission_answer_files (answer_id, file_url, file_name, file_type, file_size_bytes, uploaded_by, uploaded_at)
      VALUES (${answer_id}, ${f.url || f.file_url}, ${f.name || f.file_name || null}, ${f.type || f.file_type || null}, ${f.size || f.file_size_bytes || null}, ${uploaded_by}, NOW())
      RETURNING *
    `;
    inserted.push(row);
  }
  return inserted;
}






