-- migrations/008_add_module_to_resources.sql
-- Add module and public fields to resources table
ALTER TABLE resources 
	ADD COLUMN module VARCHAR(100),
	ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON resources(is_public);


