import sql from '../../config/db.js';

// Simple in-memory cache for published publications
const cache = {
  publishedPublications: null,
  lastUpdated: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Helper to invalidate the cache (call this whenever publications change
export function invalidatePublicationCache() {
  cache.publishedPublications = null;
  cache.lastUpdated = null;
  console.log('Publication cache invalidated');
}

// Create Publication
export async function createPublication({
  title,
  publication_type,
  publication_date,
  expiry_date,
  status,
  created_by
}) {
  const [publication] = await sql`
    INSERT INTO publications (title, publication_type, publication_date, expiry_date, status, created_by, created_at)
    VALUES (${title}, ${publication_type}, ${publication_date}, ${expiry_date}, ${status || 'PUBLISHED'}, ${created_by}, NOW())
    RETURNING *;
  `;
  invalidatePublicationCache();
  return publication;
}

// Update Publication
export async function updatePublication(publication_id, {
  title,
  publication_type,
  publication_date,
  expiry_date,
  status
}) {
  const [publication] = await sql`
    UPDATE publications SET
      title = COALESCE(${title}, title),
      publication_type = COALESCE(${publication_type}, publication_type),
      publication_date = COALESCE(${publication_date}, publication_date),
      expiry_date = ${expiry_date},
      status = COALESCE(${status}, status)
    WHERE publication_id = ${publication_id}
    RETURNING *;
  `;
  invalidatePublicationCache();
  return publication;
}

// Delete Publication
export async function deletePublication(publication_id) {
  await sql`
    DELETE FROM publications WHERE publication_id = ${publication_id}
  `;
  invalidatePublicationCache();
  return true;
}

// List all Publications with files
export async function listPublications() {
  // Fetch all publications with their files in a single query using array_agg
  const results = await sql`
    SELECT 
      p.*, 
      u.name,
      json_agg(
        json_build_object(
          'file_id', pf.file_id,
          'file_name', pf.file_name,
          'file_type', pf.file_type,
          'file_url', pf.file_url,
          'file_size_bytes', pf.file_size_bytes,
          'uploaded_by', pf.uploaded_by,
          'uploaded_at', pf.uploaded_at
        ) ORDER BY pf.uploaded_at ASC
      ) FILTER (WHERE pf.file_id IS NOT NULL) AS files
    FROM publications p
    LEFT JOIN users u ON p.created_by = u.user_id
    LEFT JOIN publication_files pf ON p.publication_id = pf.publication_id
    GROUP BY p.publication_id, u.name
    ORDER BY p.created_at DESC
  `;

  // Ensure files is always an array (empty if no files)
  return results.map(pub => ({
    ...pub,
    files: pub.files || []
  }));
}

// Get all published Publications with files (for public access)
export async function getPublishedPublications() {
  const now = Date.now();
  
  // Check if we have a valid cached value
  if (
    cache.publishedPublications &&
    cache.lastUpdated &&
    (now - cache.lastUpdated < cache.ttl)
  ) {
    console.log('Returning cached published publications');
    return cache.publishedPublications;
  }
  
  console.log('Fetching published publications from DB (cache miss or expired)');
  
  // Fetch all published publications with their files in a single query using array_agg
  const results = await sql`
    SELECT 
      p.*, 
      u.name,
      json_agg(
        json_build_object(
          'file_id', pf.file_id,
          'file_name', pf.file_name,
          'file_type', pf.file_type,
          'file_url', pf.file_url,
          'file_size_bytes', pf.file_size_bytes,
          'uploaded_by', pf.uploaded_by,
          'uploaded_at', pf.uploaded_at
        ) ORDER BY pf.uploaded_at ASC
      ) FILTER (WHERE pf.file_id IS NOT NULL) AS files
    FROM publications p
    LEFT JOIN users u ON p.created_by = u.user_id
    LEFT JOIN publication_files pf ON p.publication_id = pf.publication_id
    WHERE p.status = 'PUBLISHED'
    GROUP BY p.publication_id, u.name
    ORDER BY p.publication_date DESC
  `;

  // Ensure files is always an array (empty if no files)
  const publicationsWithFiles = results.map(pub => ({
    ...pub,
    files: pub.files || []
  }));
  
  // Update the cache
  cache.publishedPublications = publicationsWithFiles;
  cache.lastUpdated = now;
  
  return publicationsWithFiles;
}

// Get Publication by ID with files
export async function getPublicationById(publication_id) {
  const [result] = await sql`
    SELECT 
      p.*, 
      u.name,
      json_agg(
        json_build_object(
          'file_id', pf.file_id,
          'file_name', pf.file_name,
          'file_type', pf.file_type,
          'file_url', pf.file_url,
          'file_size_bytes', pf.file_size_bytes,
          'uploaded_by', pf.uploaded_by,
          'uploaded_at', pf.uploaded_at
        ) ORDER BY pf.uploaded_at ASC
      ) FILTER (WHERE pf.file_id IS NOT NULL) AS files
    FROM publications p
    LEFT JOIN users u ON p.created_by = u.user_id
    LEFT JOIN publication_files pf ON p.publication_id = pf.publication_id
    WHERE p.publication_id = ${publication_id}
    GROUP BY p.publication_id, u.name
  `;

  if (result) {
    return { ...result, files: result.files || [] };
  }
  return result;
}
