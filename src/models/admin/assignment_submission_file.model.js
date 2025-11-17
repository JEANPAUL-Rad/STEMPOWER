import sql from '../../config/db.js';

export async function addSubmissionFiles(submission_id, files, uploaded_by = null) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const inserted = [];
  for (const f of files) {
    const [row] = await sql`
      INSERT INTO assignment_submission_files (submission_id, file_url, file_name, file_size_bytes, uploaded_by, uploaded_at)
      VALUES (${submission_id}, ${f.url}, ${f.name || null}, ${f.size || null}, ${uploaded_by}, NOW())
      RETURNING *
    `;
    inserted.push(row);
  }
  return inserted;
}

export async function getFilesBySubmission(submission_id) {
  return await sql`SELECT * FROM assignment_submission_files WHERE submission_id = ${submission_id} ORDER BY uploaded_at`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM assignment_submission_files WHERE file_id = ${file_id}`;
  return true;
}
