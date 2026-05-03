import sql from '../config/db.js';

export async function getAll() {
  return sql`SELECT * FROM negprotoforial ORDER BY created_at DESC`;
}

export async function getActive() {
  return sql`SELECT * FROM negprotoforial WHERE is_active = TRUE ORDER BY created_at DESC`;
}

export async function getById(id) {
  const [row] = await sql`SELECT * FROM negprotoforial WHERE id = ${id}`;
  return row || null;
}

export async function getByCategory(category) {
  return sql`
    SELECT * FROM negprotoforial
    WHERE category = ${category}
    ORDER BY created_at DESC
  `;
}

export async function getByType(type) {
  return sql`
    SELECT * FROM negprotoforial
    WHERE type = ${type}
    ORDER BY created_at DESC
  `;
}

export async function getByCategoryAndType(category, type) {
  return sql`
    SELECT * FROM negprotoforial
    WHERE category = ${category} AND type = ${type}
    ORDER BY created_at DESC
  `;
}

export async function create({ title, category, type, file_url, description, is_active = true }) {
  const [row] = await sql`
    INSERT INTO negprotoforial (title, category, type, file_url, description, is_active)
    VALUES (${title}, ${category}, ${type}, ${file_url}, ${description}, ${is_active})
    RETURNING *
  `;
  return row || null;
}

export async function update(id, { title, category, type, file_url, description, is_active }) {
  const [row] = await sql`
    UPDATE negprotoforial
    SET title = COALESCE(${title}, title),
        category = COALESCE(${category}, category),
        type = COALESCE(${type}, type),
        file_url = COALESCE(${file_url}, file_url),
        description = COALESCE(${description}, description),
        is_active = COALESCE(${is_active}, is_active)
    WHERE id = ${id}
    RETURNING *
  `;
  return row || null;
}

export async function toggleActive(id) {
  const [row] = await sql`
    UPDATE negprotoforial
    SET is_active = NOT is_active
    WHERE id = ${id}
    RETURNING *
  `;
  return row || null;
}

export async function remove(id) {
  const [row] = await sql`DELETE FROM negprotoforial WHERE id = ${id} RETURNING *`;
  return row || null;
}
