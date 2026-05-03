import sql from '../config/db.js';

export async function getAll() {
  return sql`SELECT * FROM advertisements ORDER BY priority DESC, created_at DESC`;
}

export async function getActive() {
  return sql`
    SELECT * FROM advertisements
    WHERE is_active = TRUE
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
    ORDER BY priority DESC, created_at DESC
  `;
}

export async function getById(id) {
  const [row] = await sql`SELECT * FROM advertisements WHERE id = ${id}`;
  return row || null;
}

export async function getByType(type) {
  return sql`
    SELECT * FROM advertisements
    WHERE type = ${type}
      AND is_active = TRUE
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
    ORDER BY priority DESC, created_at DESC
  `;
}

export async function create({
  title,
  type,
  file_url,
  text_content,
  link,
  is_active = true,
  start_date,
  end_date,
  priority = 0,
}) {
  const [row] = await sql`
    INSERT INTO advertisements
      (title, type, file_url, text_content, link, is_active, start_date, end_date, priority)
    VALUES (${title}, ${type}, ${file_url}, ${text_content}, ${link}, ${is_active}, ${start_date}, ${end_date}, ${priority})
    RETURNING *
  `;
  return row || null;
}

export async function update(
  id,
  { title, type, file_url, text_content, link, is_active, start_date, end_date, priority }
) {
  const [row] = await sql`
    UPDATE advertisements
    SET title = COALESCE(${title}, title),
        type = COALESCE(${type}, type),
        file_url = COALESCE(${file_url}, file_url),
        text_content = COALESCE(${text_content}, text_content),
        link = COALESCE(${link}, link),
        is_active = COALESCE(${is_active}, is_active),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        priority = COALESCE(${priority}, priority)
    WHERE id = ${id}
    RETURNING *
  `;
  return row || null;
}

export async function toggleActive(id) {
  const [row] = await sql`
    UPDATE advertisements
    SET is_active = NOT is_active
    WHERE id = ${id}
    RETURNING *
  `;
  return row || null;
}

export async function remove(id) {
  const [row] = await sql`DELETE FROM advertisements WHERE id = ${id} RETURNING *`;
  return row || null;
}
