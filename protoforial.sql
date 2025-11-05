-- Create protoforial table (MEP Designer Chamber profiles)
CREATE TABLE IF NOT EXISTS protoforial (
  proto_id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  course VARCHAR(100),
  experience_years INT DEFAULT 0,
  -- single inline document (optional). For multiple files, see protoforial_documents
  support_document BYTEA,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful index for quick lookups
CREATE INDEX IF NOT EXISTS idx_protoforial_email ON protoforial(email);

-- If column exists as TEXT from previous versions, convert to BYTEA (nullable)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='protoforial' AND column_name='support_document' AND data_type <> 'bytea'
    ) THEN
        ALTER TABLE protoforial ALTER COLUMN support_document TYPE BYTEA USING NULL;
    END IF;
END$$;

-- Multiple documents per profile
CREATE TABLE IF NOT EXISTS protoforial_documents (
  document_id SERIAL PRIMARY KEY,
  proto_id INT NOT NULL REFERENCES protoforial(proto_id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proto_docs_proto_id ON protoforial_documents(proto_id);


