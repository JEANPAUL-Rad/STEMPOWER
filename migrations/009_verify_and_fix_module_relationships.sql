-- ==============================
-- MIGRATION 9: Verify and Fix Module Relationships
-- ==============================
-- This migration verifies all relationships and fixes any issues

-- 1. Verify Weeks table has module column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weeks' AND column_name = 'module'
    ) THEN
        ALTER TABLE weeks ADD COLUMN module VARCHAR(100);
        RAISE NOTICE 'Added module column to weeks table';
    ELSE
        RAISE NOTICE 'Weeks table already has module column';
    END IF;
END $$;

-- 2. Verify Resources table has module and is_public columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'module'
    ) THEN
        ALTER TABLE resources ADD COLUMN module VARCHAR(100);
        RAISE NOTICE 'Added module column to resources table';
    ELSE
        RAISE NOTICE 'Resources table already has module column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE resources ADD COLUMN is_public BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_public column to resources table';
    ELSE
        RAISE NOTICE 'Resources table already has is_public column';
    END IF;
END $$;

-- 3. Create/Verify all necessary indexes for module filtering
CREATE INDEX IF NOT EXISTS idx_weeks_module ON weeks(module);
CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON resources(is_public);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_module ON enrollments(module);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_module_status ON enrollments(user_id, module, status);

-- 4. Create composite indexes for faster joins
CREATE INDEX IF NOT EXISTS idx_projects_week_id ON projects(week_id);
CREATE INDEX IF NOT EXISTS idx_lessons_project_id ON lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project_id ON assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_project_id ON quizzes(project_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);

-- 5. Verify foreign key relationships exist
DO $$
BEGIN
    -- Verify projects -> weeks relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_week_id_fkey'
    ) THEN
        ALTER TABLE projects 
        ADD CONSTRAINT projects_week_id_fkey 
        FOREIGN KEY (week_id) REFERENCES weeks(week_id);
        RAISE NOTICE 'Added foreign key: projects -> weeks';
    END IF;
    
    -- Verify lessons -> projects relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lessons_project_id_fkey'
    ) THEN
        ALTER TABLE lessons 
        ADD CONSTRAINT lessons_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(project_id);
        RAISE NOTICE 'Added foreign key: lessons -> projects';
    END IF;
    
    -- Verify assignments -> projects relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignments_project_id_fkey'
    ) THEN
        ALTER TABLE assignments 
        ADD CONSTRAINT assignments_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(project_id);
        RAISE NOTICE 'Added foreign key: assignments -> projects';
    END IF;
    
    -- Verify assignments -> lessons relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignments_lesson_id_fkey'
    ) THEN
        ALTER TABLE assignments 
        ADD CONSTRAINT assignments_lesson_id_fkey 
        FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id);
        RAISE NOTICE 'Added foreign key: assignments -> lessons';
    END IF;
    
    -- Verify quizzes -> projects relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quizzes_project_id_fkey'
    ) THEN
        ALTER TABLE quizzes 
        ADD CONSTRAINT quizzes_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(project_id);
        RAISE NOTICE 'Added foreign key: quizzes -> projects';
    END IF;
    
    -- Verify quizzes -> lessons relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quizzes_lesson_id_fkey'
    ) THEN
        ALTER TABLE quizzes 
        ADD CONSTRAINT quizzes_lesson_id_fkey 
        FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id);
        RAISE NOTICE 'Added foreign key: quizzes -> lessons';
    END IF;
END $$;

-- ==============================
-- DIAGNOSTIC QUERIES
-- ==============================
-- Run these to check for issues:

-- Check if weeks have modules set:
-- SELECT week_id, title, module FROM weeks WHERE module IS NULL;

-- Check if resources have modules set:
-- SELECT resource_id, title, type, module, is_public FROM resources;

-- Check module name variations in database:
-- SELECT DISTINCT module FROM weeks WHERE module IS NOT NULL;
-- SELECT DISTINCT module FROM resources WHERE module IS NOT NULL;
-- SELECT DISTINCT module FROM enrollments WHERE module IS NOT NULL;
-- SELECT DISTINCT module FROM register WHERE module IS NOT NULL;

-- Check for orphaned projects (projects without weeks):
-- SELECT p.project_id, p.title FROM projects p 
-- LEFT JOIN weeks w ON p.week_id = w.week_id 
-- WHERE w.week_id IS NULL;

-- Check for orphaned lessons (lessons without projects):
-- SELECT l.lesson_id, l.title FROM lessons l 
-- LEFT JOIN projects p ON l.project_id = p.project_id 
-- WHERE p.project_id IS NULL;

-- ==============================
-- HELPER FUNCTION: Normalize Module Names
-- ==============================
CREATE OR REPLACE FUNCTION normalize_module_name(input_module VARCHAR(100))
RETURNS VARCHAR(100) AS $$
BEGIN
    IF input_module IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Convert to lowercase for comparison
    DECLARE
        lower_module VARCHAR(100);
    BEGIN
        lower_module := LOWER(TRIM(input_module));
        
        -- Map to standard names
        IF lower_module LIKE '%electrical%' AND lower_module NOT LIKE '%plumbing%' THEN
            RETURN 'Electrical Design';
        ELSIF lower_module LIKE '%plumbing%' OR lower_module LIKE '%mechanical%' OR lower_module LIKE '%hvac%' THEN
            RETURN 'Plumbing & Mechanical Design (HVAC)';
        ELSIF lower_module LIKE '%mep%' THEN
            RETURN 'MEP Design';
        ELSE
            RETURN TRIM(input_module);
        END IF;
    END;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- FIX SCRIPT: Normalize existing module names
-- ==============================
-- Uncomment and run these if you need to normalize existing data:

-- Normalize weeks module names:
-- UPDATE weeks 
-- SET module = normalize_module_name(module)
-- WHERE module IS NOT NULL;

-- Normalize resources module names:
-- UPDATE resources 
-- SET module = normalize_module_name(module)
-- WHERE module IS NOT NULL;

-- Normalize enrollments module names:
-- UPDATE enrollments 
-- SET module = normalize_module_name(module)
-- WHERE module IS NOT NULL;

-- Normalize register module names:
-- UPDATE register 
-- SET module = normalize_module_name(module)
-- WHERE module IS NOT NULL;

-- ==============================
-- VERIFICATION QUERY
-- ==============================
-- This query shows the complete relationship chain for assignments:
-- 
-- SELECT 
--     a.assignment_id,
--     a.title as assignment_title,
--     p.project_id,
--     p.title as project_title,
--     w.week_id,
--     w.title as week_title,
--     w.module as week_module,
--     l.lesson_id,
--     l.title as lesson_title
-- FROM assignments a
-- LEFT JOIN projects p ON a.project_id = p.project_id
-- LEFT JOIN weeks w ON p.week_id = w.week_id
-- LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
-- LEFT JOIN projects p2 ON l.project_id = p2.project_id
-- LEFT JOIN weeks w2 ON p2.week_id = w2.week_id
-- ORDER BY a.assignment_id;

-- ==============================
-- END OF MIGRATION
-- ==============================

