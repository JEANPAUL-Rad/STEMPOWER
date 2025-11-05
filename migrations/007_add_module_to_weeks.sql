-- migrations/007_add_module_to_weeks.sql
-- Add module field to weeks table to link courses to modules
ALTER TABLE weeks 
	ADD COLUMN module VARCHAR(100);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_weeks_module ON weeks(module);


