
-- Create publication_files table to store uploaded files for publications
CREATE TABLE IF NOT EXISTS publication_files (
  file_id SERIAL PRIMARY KEY,
  publication_id INTEGER REFERENCES publications(publication_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Drop the old file_url column if we don't need it anymore
ALTER TABLE publications DROP COLUMN IF EXISTS file_url;
