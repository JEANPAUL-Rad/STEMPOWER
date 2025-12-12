-- Add category column to protoforial_documents table
-- This allows documents to be categorized as 'media', 'document', or 'project'
-- based on the upload option selected by the user

ALTER TABLE protoforial_documents 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) CHECK (category IN ('media', 'document', 'project'));

-- Create index for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_proto_docs_category ON protoforial_documents(category);

-- Add comment to explain the column
COMMENT ON COLUMN protoforial_documents.category IS 'Category of the document: media (images/videos), document (CVs, etc.), or project (PDF projects)';

