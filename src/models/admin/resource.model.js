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

// Create Resource (files are stored separately in resource_files)
export async function createResource({ type, title, content, module, is_public, week_id = null }) {
  const [resource] = await sql`
    INSERT INTO resources (type, title, content, module, is_public, week_id, created_at)
    VALUES (${type}, ${title}, ${content}, ${module}, ${is_public}, ${week_id}, NOW())
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
  const rows = await sql`
    SELECT
      r.*,
      COALESCE(file_data.files, '[]'::json) AS files,
      file_data.file_url,
      file_data.image_url,
      file_data.video_url,
      w.title AS week_title,
      w.order_num AS week_order
    FROM resources r
    LEFT JOIN weeks w ON r.week_id = w.week_id
    LEFT JOIN LATERAL (
      SELECT
        json_agg(
          json_build_object(
            'file_id', rf.file_id,
            'file_url', rf.file_url,
            'file_name', rf.file_name,
            'file_type', rf.file_type,
            'file_size_bytes', rf.file_size_bytes,
            'uploaded_at', rf.uploaded_at
          )
          ORDER BY rf.uploaded_at
        ) AS files,
        MIN(CASE
              WHEN rf.file_type IS NULL
                OR (rf.file_type NOT LIKE 'image/%' AND rf.file_type NOT LIKE 'video/%')
              THEN rf.file_url
            END) AS file_url,
        MIN(CASE
              WHEN rf.file_type LIKE 'image/%'
                OR rf.file_type = 'image/remote'
              THEN rf.file_url
            END) AS image_url,
        MIN(CASE
              WHEN rf.file_type LIKE 'video/%'
                OR rf.file_type = 'text/url'
              THEN rf.file_url
            END) AS video_url
      FROM resource_files rf
      WHERE rf.resource_id = r.resource_id
    ) AS file_data ON TRUE
    ORDER BY r.created_at DESC
  `;
  return rows;
}

// Get Resource by ID
export async function getResourceById(resource_id) {
  const [resource] = await sql`
    SELECT * FROM resources WHERE resource_id = ${resource_id}
  `;
  return resource;
}

// Update Resource
export async function updateResource(resource_id, { type, title, content, module, is_public, week_id = null }) {
  const [resource] = await sql`
    UPDATE resources SET 
      type = COALESCE(${type}, type),
      title = COALESCE(${title}, title), 
      content = COALESCE(${content}, content),
      module = COALESCE(${module}, module),
      is_public = COALESCE(${is_public}, is_public),
      week_id = COALESCE(${week_id}, week_id)
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