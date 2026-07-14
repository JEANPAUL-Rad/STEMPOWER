-- Migration: Create publications table

CREATE TABLE IF NOT EXISTS publications (
  publication_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  publication_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  publication_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'PUBLISHED',
  created_by INTEGER REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
