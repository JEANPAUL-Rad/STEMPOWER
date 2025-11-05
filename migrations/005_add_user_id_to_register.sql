-- migrations/005_add_user_id_to_register.sql
-- Link register table to users table
ALTER TABLE register 
	ADD COLUMN user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_register_user_id ON register(user_id);


