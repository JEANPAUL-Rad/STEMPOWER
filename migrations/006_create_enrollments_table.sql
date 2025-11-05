-- migrations/006_create_enrollments_table.sql
-- Create enrollments table to track student course enrollments
CREATE TABLE IF NOT EXISTS enrollments (
	enrollment_id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
	registration_id INTEGER REFERENCES register(id) ON DELETE SET NULL,
	module VARCHAR(100) NOT NULL,
	enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	status VARCHAR(20) DEFAULT 'active' 
		CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
	expires_at TIMESTAMP, -- Optional: for course expiration
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT unique_user_module UNIQUE (user_id, module)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_module ON enrollments(module);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_module_status ON enrollments(user_id, module, status);


