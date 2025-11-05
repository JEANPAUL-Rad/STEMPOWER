import sql from '../../config/db.js';

// Create a week
export async function createWeek({ title, description, order_num, module }) {
  const res = await sql`
    INSERT INTO weeks (title, description, order_num, module)
    VALUES (${title}, ${description}, ${order_num}, ${module || null})
    RETURNING *
  `;
  return res[0];
}

// Get all weeks
export async function getAllWeeks() {
  const res = await sql`
    SELECT * FROM weeks ORDER BY order_num ASC, created_at ASC
  `;
  return res;
}

// Get week by ID
export async function getWeekById(week_id) {
  const res = await sql`
    SELECT * FROM weeks WHERE week_id = ${week_id}
  `;
  return res[0];
}

// Update week
export async function updateWeek(week_id, { title, description, order_num, module }) {
  const res = await sql`
    UPDATE weeks SET
      title = COALESCE(${title}, title),
      description = COALESCE(${description}, description),
      order_num = COALESCE(${order_num}, order_num),
      module = COALESCE(${module}, module),
      updated_at = CURRENT_TIMESTAMP
    WHERE week_id = ${week_id}
    RETURNING *
  `;
  return res[0];
}

// Delete week
export async function deleteWeek(week_id) {
  await sql`
    DELETE FROM weeks WHERE week_id = ${week_id}
  `;
  return true;
}