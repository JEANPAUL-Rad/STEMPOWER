import sql from '../../config/db.js';

export async function addProtoforialFile({ proto_id, file_url, file_name = null, file_type = null, file_size_bytes = null }) {
  const [row] = await sql`
    INSERT INTO protoforial_files (proto_id, file_url, file_name, file_type, file_size_bytes, uploaded_at)
    VALUES (${proto_id}, ${file_url}, ${file_name}, ${file_type}, ${file_size_bytes}, NOW())
    RETURNING *;
  `;
  return row;
}

export async function getFilesByProtoId(proto_id) {
  return await sql`SELECT * FROM protoforial_files WHERE proto_id = ${proto_id} ORDER BY uploaded_at ASC`;
}

export async function deleteFile(file_id) {
  await sql`DELETE FROM protoforial_files WHERE file_id = ${file_id}`;
  return true;
}

export async function addProtoforialFiles(proto_id, files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const inserted = [];
  for (const f of files) {
    const [row] = await sql`
      INSERT INTO protoforial_files (proto_id, file_url, file_name, file_type, file_size_bytes, uploaded_at)
      VALUES (${proto_id}, ${f.url || f.file_url}, ${f.name || f.file_name || null}, ${f.type || f.file_type || null}, ${f.size || f.file_size_bytes || null}, NOW())
      RETURNING *
    `;
    inserted.push(row);
  }
  return inserted;
}

