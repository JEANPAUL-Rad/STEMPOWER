import sql from '../../config/db.js';

export async function addLessonFile({ lesson_id, file_url, file_name = null, file_type = null, file_size_bytes = null, uploaded_by = null }) {
  const [row] = await sql`
    INSERT INTO lesson_files (lesson_id, file_url, file_name, file_type, file_size_bytes, uploaded_by, uploaded_at)
    VALUES (${lesson_id}, ${file_url}, ${file_name}, ${file_type}, ${file_size_bytes}, ${uploaded_by}, NOW())
    RETURNING *;
  `;
  return row;
}

export async function getFilesByLessonId(lesson_id) {
  return await sql`SELECT * FROM lesson_files WHERE lesson_id = ${lesson_id} ORDER BY uploaded_at ASC`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM lesson_files WHERE file_id = ${file_id}`;
  return true;
}
