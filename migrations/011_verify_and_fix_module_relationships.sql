-- =====================================================
-- VERIFICATION AND FIX FOR MODULE RELATIONSHIPS
-- Run this script to verify and fix module relationships
-- =====================================================

-- Step 1: Verify all required columns exist
-- =====================================================
DO $$
BEGIN
    -- Check if weeks.module exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weeks' AND column_name = 'module'
    ) THEN
        ALTER TABLE weeks ADD COLUMN module VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_weeks_module ON weeks(module);
        RAISE NOTICE 'Added module column to weeks table';
    ELSE
        RAISE NOTICE 'weeks.module column already exists';
    END IF;

    -- Check if resources.module exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'module'
    ) THEN
        ALTER TABLE resources ADD COLUMN module VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module);
        RAISE NOTICE 'Added module column to resources table';
    ELSE
        RAISE NOTICE 'resources.module column already exists';
    END IF;

    -- Check if resources.is_public exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE resources ADD COLUMN is_public BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_resources_is_public ON resources(is_public);
        RAISE NOTICE 'Added is_public column to resources table';
    ELSE
        RAISE NOTICE 'resources.is_public column already exists';
    END IF;
END $$;

-- Step 2: Normalize module names in all tables to standard format
-- =====================================================

-- Normalize weeks.module
UPDATE weeks 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- Normalize resources.module
UPDATE resources 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- Normalize register.module
UPDATE register 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- Normalize enrollments.module
UPDATE enrollments 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- Step 3: Ensure all indexes exist
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_weeks_module ON weeks(module);
CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON resources(is_public);
CREATE INDEX IF NOT EXISTS idx_register_user_id ON register(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_module ON enrollments(module);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_module_status ON enrollments(user_id, module, status);

-- Step 4: Diagnostic Queries (for verification)
-- =====================================================
-- Uncomment to run diagnostics:
/*
-- Check weeks module distribution
SELECT module, COUNT(*) as count 
FROM weeks 
WHERE module IS NOT NULL 
GROUP BY module 
ORDER BY count DESC;

-- Check resources module distribution
SELECT module, is_public, COUNT(*) as count 
FROM resources 
GROUP BY module, is_public 
ORDER BY module, is_public;

-- Check enrollments module distribution
SELECT module, status, COUNT(*) as count 
FROM enrollments 
GROUP BY module, status 
ORDER BY module, status;

-- Check register module distribution
SELECT module, payment_status, COUNT(*) as count 
FROM register 
WHERE module IS NOT NULL 
GROUP BY module, payment_status 
ORDER BY module, payment_status;

-- Find weeks without modules
SELECT week_id, title, module 
FROM weeks 
WHERE module IS NULL OR module = ''
ORDER BY week_id;

-- Find orphaned content (weeks/projects/lessons not linked to any module)
SELECT 
    'weeks' as table_name,
    week_id as id,
    title,
    module
FROM weeks 
WHERE module IS NULL OR module = ''

UNION ALL

SELECT 
    'projects' as table_name,
    p.project_id as id,
    p.title,
    w.module
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''

UNION ALL

SELECT 
    'lessons' as table_name,
    l.lesson_id as id,
    l.title,
    w.module
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = '';
*/

-- =====================================================
-- VERIFICATION COMPLETE
-- =====================================================
-- All module relationships should now be properly set up
-- Content is now linked through:
--   - Weeks → module (direct)
--   - Projects → week_id → weeks.module
--   - Lessons → project_id → projects → weeks.module  
--   - Assignments → (project_id OR lesson_id) → projects/lessons → weeks.module
--   - Quizzes → project_id → projects → weeks.module
--   - Resources → module (direct)
-- =====================================================

















