-- =====================================================
-- ENROLLMENT-BASED ACCESS CONTROL MIGRATIONS
-- Run these migrations in order
-- =====================================================

-- Migration 1: Link register table to users table
-- =====================================================
ALTER TABLE register 
	ADD COLUMN user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_register_user_id ON register(user_id);

-- Migration 2: Create enrollments table
-- =====================================================
CREATE TABLE IF NOT EXISTS enrollments (
	enrollment_id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
	registration_id INTEGER REFERENCES register(id) ON DELETE SET NULL,
	module VARCHAR(100) NOT NULL,
	enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	status VARCHAR(20) DEFAULT 'active' 
		CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
	expires_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT unique_user_module UNIQUE (user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_module ON enrollments(module);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_module_status ON enrollments(user_id, module, status);

-- Migration 3: Add module to weeks table
-- =====================================================
ALTER TABLE weeks 
	ADD COLUMN module VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_weeks_module ON weeks(module);

-- Migration 4: Add module and is_public to resources table
-- =====================================================
ALTER TABLE resources 
	ADD COLUMN module VARCHAR(100),
	ADD COLUMN is_public BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON resources(is_public);

-- =====================================================
-- MIGRATIONS COMPLETE
-- =====================================================
-- After running these migrations:
-- 1. Update existing weeks with appropriate module names
-- 2. Update existing resources with module names and public flag
-- 3. Enrollments will be created automatically when payment status is updated to 'Paid'
-- =====================================================


