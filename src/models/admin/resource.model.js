// import sql from '../../config/db.js';

// // Create Resource
// export async function createResource({ type, title, content, file_url }) {
//   const [resource] = await sql`
//     INSERT INTO resources (type, title, content, file_url, created_at)
//     VALUES (${type}, ${title}, ${content}, ${file_url}, NOW())
//     RETURNING *;
//   `;
//   return resource;
// }

// // List all Resources
// export async function listResources() {
//   return await sql`SELECT * FROM resources ORDER BY created_at DESC`;
// }

// // Get Resource by ID
// export async function getResourceById(resource_id) {
//   const [resource] = await sql`
//     SELECT * FROM resources WHERE resource_id = ${resource_id}
//   `;
//   return resource;
// }

// // Update Resource
// export async function updateResource(resource_id, { type, title, content, file_url }) {
//   const [resource] = await sql`
//     UPDATE resources SET
//       type = COALESCE(${type}, type),
//       title = COALESCE(${title}, title),
//       content = COALESCE(${content}, content),
//       file_url = COALESCE(${file_url}, file_url)
//     WHERE resource_id = ${resource_id}
//     RETURNING *;
//   `;
//   return resource;
// }

// // Delete Resource
// export async function deleteResource(resource_id) {
//   await sql`
//     DELETE FROM resources WHERE resource_id = ${resource_id}
//   `;
//   return true;
// }

import sql from '../../config/db.js';

// Create Resource
export async function createResource({ type, title, content, file_url }) {
  const [resource] = await sql`
    INSERT INTO resources (type, title, content, file_url, created_at) 
    VALUES (${type}, ${title}, ${content}, ${file_url}, NOW()) 
    RETURNING *;
  `;
  return resource;
}

// List all Resources with pagination and search
export async function listResources(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;
  
  let resources, totalCount;
  
  if (search) {
    resources = await sql`
      SELECT * FROM resources 
      WHERE title ILIKE ${`%${search}%`} OR type ILIKE ${`%${search}%`}
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [count] = await sql`
      SELECT COUNT(*) as total FROM resources 
      WHERE title ILIKE ${`%${search}%`} OR type ILIKE ${`%${search}%`}
    `;
    totalCount = parseInt(count.total);
  } else {
    resources = await sql`
      SELECT * FROM resources 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [count] = await sql`SELECT COUNT(*) as total FROM resources`;
    totalCount = parseInt(count.total);
  }

  return {
    resources,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page * limit < totalCount,
      hasPrev: page > 1
    }
  };
}

// Get all resources without pagination (for frontend compatibility)
export async function getAllResources() {
  return await sql`SELECT * FROM resources ORDER BY created_at DESC`;
}

// Get Resource by ID
export async function getResourceById(resource_id) {
  const [resource] = await sql`
    SELECT * FROM resources WHERE resource_id = ${resource_id}
  `;
  return resource;
}

// Update Resource
export async function updateResource(resource_id, { type, title, content, file_url }) {
  const [resource] = await sql`
    UPDATE resources SET 
      type = COALESCE(${type}, type),
      title = COALESCE(${title}, title), 
      content = COALESCE(${content}, content),
      file_url = COALESCE(${file_url}, file_url)
    WHERE resource_id = ${resource_id} 
    RETURNING *;
  `;
  return resource;
}

// Delete Resource
export async function deleteResource(resource_id) {
  await sql`DELETE FROM resources WHERE resource_id = ${resource_id}`;
  return true;
}