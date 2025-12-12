-- migrations/019_add_updated_at_to_register.sql
-- Add updated_at column to register table for tracking payment status updates

ALTER TABLE register 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create a trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_register_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_register_updated_at ON register;
CREATE TRIGGER trigger_update_register_updated_at
    BEFORE UPDATE ON register
    FOR EACH ROW
    EXECUTE FUNCTION update_register_updated_at();

-- Update existing rows to set updated_at = created_at for records that don't have updated_at set
UPDATE register 
SET updated_at = created_at 
WHERE updated_at IS NULL OR updated_at < created_at;

