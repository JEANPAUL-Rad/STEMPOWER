import sql from '../config/db.js';

export async function getAll() {
  return sql`SELECT * FROM announcements ORDER BY created_at DESC`;
}

export async function getActive() {
  return sql`SELECT * FROM announcements WHERE is_active = TRUE ORDER BY created_at DESC`;
}

export async function getById(id) {
  const [row] = await sql`SELECT * FROM announcements WHERE id = ${id}`;
  return row || null;
}

export async function create({ title, message, is_active = true }) {
  const [row] = await sql`
    INSERT INTO announcements (title, message, is_active)
    VALUES (${title}, ${message}, ${is_active})
    RETURNING *
  `;
  return row || null;
}

export async function update(id, { title, message, is_active }) {
  const [row] = await sql`
    UPDATE announcements
    SET title = COALESCE(${title}, title),
        message = COALESCE(${message}, message),
        is_active = COALESCE(${is_active}, is_active)
    WHERE id = ${id}
    RETURNING *
  `;
  return row || null;
}

export async function toggleActive(id) {
  const [row] = await sql`
    UPDATE announcements
    SET is_active = NOT is_active
    WHERE id = ${id}
    RETURNING *
  `;
  return row || null;
}

export async function remove(id) {
  const [row] = await sql`DELETE FROM announcements WHERE id = ${id} RETURNING *`;
  return row || null;
}
