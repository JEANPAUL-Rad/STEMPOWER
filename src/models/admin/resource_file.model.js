import sql from '../../config/db.js';

export async function addResourceFile({ resource_id, file_url, file_name = null, file_type = null, file_size_bytes = null, uploaded_by = null }) {
  const [row] = await sql`
    INSERT INTO resource_files (resource_id, file_url, file_name, file_type, file_size_bytes, uploaded_by, uploaded_at)
    VALUES (${resource_id}, ${file_url}, ${file_name}, ${file_type}, ${file_size_bytes}, ${uploaded_by}, NOW())
    RETURNING *;
  `;
  return row;
}

export async function getFilesByResourceId(resource_id) {
  return await sql`SELECT * FROM resource_files WHERE resource_id = ${resource_id} ORDER BY uploaded_at ASC`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM resource_files WHERE file_id = ${file_id}`;
  return true;
}
