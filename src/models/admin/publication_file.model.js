
import sql from '../../config/db.js';
import { invalidatePublicationCache } from './publication.model.js';

export async function addPublicationFile({ publication_id, file_url, file_name = null, file_type = null, file_size_bytes = null, uploaded_by = null }) {
  const [row] = await sql`
    INSERT INTO publication_files (publication_id, file_url, file_name, file_type, file_size_bytes, uploaded_by, uploaded_at)
    VALUES (${publication_id}, ${file_url}, ${file_name}, ${file_type}, ${file_size_bytes}, ${uploaded_by}, NOW())
    RETURNING *;
  `;
  invalidatePublicationCache();
  return row;
}

export async function getFilesByPublicationId(publication_id) {
  return await sql`SELECT * FROM publication_files WHERE publication_id = ${publication_id} ORDER BY uploaded_at ASC`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM publication_files WHERE file_id = ${file_id}`;
  invalidatePublicationCache();
  return true;
}
