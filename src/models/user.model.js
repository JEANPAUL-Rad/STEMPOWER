
import sql from '../config/db.js';
import bcrypt from 'bcrypt';

export const createUser = async ({ name, email, password, role = 'student' }) => {
  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
    VALUES (${name}, ${email}, ${password_hash}, ${role}, NOW(), NOW())
    RETURNING user_id, name, email, role
  `;
  return user;
};

export const findUserByEmail = async (email) => {
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return user;
};

export const confirmUser = async (email) => {
  const [user] = await sql`
    UPDATE users SET updated_at = NOW() WHERE email = ${email}
    RETURNING user_id, name, email, role
  `;
  return user;
};

// Approve user (set status to 'active')
export const approveUser = async (user_id) => {
  const [user] = await sql`
    UPDATE users SET status='active' WHERE user_id = ${user_id} RETURNING *;
  `;
  return user;
};

// Block user (set status to 'blocked')
export const blockUser = async (user_id) => {
  const [user] = await sql`
    UPDATE users SET status='blocked' WHERE user_id = ${user_id} RETURNING *;
  `;
  return user;
};

// Unblock user (set status to 'active')
export const unblockUser = async (user_id) => {
  const [user] = await sql`
    UPDATE users SET status='active' WHERE user_id = ${user_id} RETURNING *;
  `;
  return user;
};

export const findUserById = async (user_id) => {
  const [user] = await sql`
    SELECT * FROM users WHERE user_id = ${user_id}
  `;
  return user;
};

export const updateUser = async (user_id, fields) => {
  // Only allow editable fields
  const allowed = ['name', 'email', 'role', 'status'];
  const updates = [];
  const values = [user_id];
  let idx = 2;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(fields[key]);
      idx++;
    }
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  // Always update updated_at
  updates.push(`updated_at = NOW()`);

  const setClause = updates.join(', ');

  // Only interpolate the SET clause, not the values!
  const sqlString = `UPDATE users SET ${setClause} WHERE user_id = $1 RETURNING *;`;

  const [user] = await sql.unsafe(sqlString, values);
  return user;
};

export const deleteUser = async (user_id) => {
  const [user] = await sql`
    DELETE FROM users WHERE user_id = ${user_id} RETURNING *;
  `;
  return user;
};

// List all users
export const getAllUsers = async () => {
  return await sql`
    SELECT user_id, name, email, role, status FROM users;
  `;
};

// Count all users
export const countAllUsers = async () => {
  const [result] = await sql`
    SELECT COUNT(*)::int AS count FROM users;
  `;
  return result.count;
};

// List users by role
export const getUsersByRole = async (role) => {
  if (!role) throw new Error('Role is required');
  return await sql`
    SELECT user_id, name, email, role, status FROM users WHERE role = ${role};
  `;
};

// List users by status
export const getUsersByStatus = async (status) => {
  if (!status) throw new Error('Status is required');
  return await sql`
    SELECT user_id, name, email, role, status FROM users WHERE status = ${status};
  `;
};

// List users by role and status
export const getUsersByRoleAndStatus = async (role, status) => {
  if (!role || !status) throw new Error('Role and status are required');
  return await sql`
    SELECT user_id, name, email, role, status FROM users WHERE role = ${role} AND status = ${status};
  `;
};

// Count users by role
export const countUsersByRole = async (role) => {
  if (!role) throw new Error('Role is required');
  const [result] = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE role = ${role};
  `;
  return result.count;
};

// Count users by status
export const countUsersByStatus = async (status) => {
  if (!status) throw new Error('Status is required');
  const [result] = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE status = ${status};
  `;
  return result.count;
};

// Count users by role and status
export const countUsersByRoleAndStatus = async (role, status) => {
  if (!role || !status) throw new Error('Role and status are required');
  const [result] = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE role = ${role} AND status = ${status};
  `;
  return result.count;
};

// Get users with search, pagination, and filters
export const getUsersWithPagination = async ({ 
  search = '', 
  role = '', 
  status = '', 
  page = 1, 
  limit = 6 
}) => {
  const offset = (page - 1) * limit;
  
  // Build WHERE conditions
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;
  
  // Search condition (name or email)
  if (search && search.trim()) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }
  
  // Role filter
  if (role && role.trim()) {
    whereConditions.push(`role = $${paramIndex}`);
    params.push(role.trim());
    paramIndex++;
  }
  
  // Status filter
  if (status && status.trim()) {
    whereConditions.push(`status = $${paramIndex}`);
    params.push(status.trim());
    paramIndex++;
  }
  
  // Build WHERE clause
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // Add pagination parameters
  params.push(limit, offset);
  const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  
  // Build final query
  const query = `
    SELECT user_id, name, email, role, status, created_at, updated_at 
    FROM users 
    ${whereClause} 
    ORDER BY created_at DESC 
    ${limitClause}
  `;
  
  const users = await sql.unsafe(query, params);
  return users;
};

// Count users with search and filters (for pagination)
export const countUsersWithFilters = async ({ 
  search = '', 
  role = '', 
  status = '' 
}) => {
  // Build WHERE conditions
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;
  
  // Search condition (name or email)
  if (search && search.trim()) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }
  
  // Role filter
  if (role && role.trim()) {
    whereConditions.push(`role = $${paramIndex}`);
    params.push(role.trim());
    paramIndex++;
  }
  
  // Status filter
  if (status && status.trim()) {
    whereConditions.push(`status = $${paramIndex}`);
    params.push(status.trim());
    paramIndex++;
  }
  
  // Build WHERE clause
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // Build final query
  const query = `SELECT COUNT(*)::int AS count FROM users ${whereClause}`;
  
  const [result] = await sql.unsafe(query, params);
  return result.count;
};

// Save the reset token and expiry
export const setPasswordResetToken = async (user_id, reset_token, expires_at) => {
  await sql`
    UPDATE users SET reset_token=${reset_token}, reset_token_expires=${expires_at}
    WHERE user_id = ${user_id}
  `;
};

// Find user by reset token (and not expired)
export const findUserByResetToken = async (token) => {
  const now = Date.now();
  const [user] = await sql`
    SELECT * FROM users WHERE reset_token=${token} AND reset_token_expires > ${now}
  `;
  return user;
};

// Update user's password and clear token fields
export const updateUserPassword = async (user_id, password_hash) => {
  await sql`
    UPDATE users
    SET password_hash=${password_hash}, reset_token=NULL, reset_token_expires=NULL
    WHERE user_id=${user_id}
  `;
};
