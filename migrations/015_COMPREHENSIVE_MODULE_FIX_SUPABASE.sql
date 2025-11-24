-- =====================================================
-- COMPREHENSIVE MODULE FIX FOR SUPABASE DATABASE
-- This script ensures all content is properly linked to modules
-- Run this script to fix and verify module relationships
-- =====================================================

-- STEP 1: Verify all required columns exist
-- =====================================================
DO $$
BEGIN
    -- Check if weeks.module exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weeks' AND column_name = 'module'
    ) THEN
        ALTER TABLE weeks ADD COLUMN module VARCHAR(100);
        RAISE NOTICE 'Added module column to weeks table';
    END IF;

    -- Check if resources.module exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'module'
    ) THEN
        ALTER TABLE resources ADD COLUMN module VARCHAR(100);
        RAISE NOTICE 'Added module column to resources table';
    END IF;

    -- Check if resources.is_public exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE resources ADD COLUMN is_public BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_public column to resources table';
    END IF;
END $$;

-- STEP 2: Create/Update Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_weeks_module ON weeks(module) WHERE module IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module) WHERE module IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON resources(is_public);
CREATE INDEX IF NOT EXISTS idx_register_user_id ON register(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_module ON enrollments(module);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_module_status ON enrollments(user_id, module, status);
CREATE INDEX IF NOT EXISTS idx_projects_week_id ON projects(week_id);
CREATE INDEX IF NOT EXISTS idx_lessons_project_id ON lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project_id ON assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_project_id ON quizzes(project_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);

-- STEP 3: Normalize Module Names in All Tables
-- =====================================================

-- 3.1 Normalize weeks.module
UPDATE weeks 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%mep%'
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE COALESCE(TRIM(module), '')
END
WHERE module IS NOT NULL AND module != '';

-- 3.2 Normalize resources.module
UPDATE resources 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%mep%'
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE COALESCE(TRIM(module), '')
END
WHERE module IS NOT NULL AND module != '';

-- 3.3 Normalize register.module
UPDATE register 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%mep%'
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE COALESCE(TRIM(module), '')
END
WHERE module IS NOT NULL AND module != '';

-- 3.4 Normalize enrollments.module
UPDATE enrollments 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%mep%'
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE COALESCE(TRIM(module), '')
END
WHERE module IS NOT NULL AND module != '';

-- STEP 4: Diagnostic Queries (Uncomment to run)
-- =====================================================
-- These queries help you identify what needs fixing

/*
-- 4.1 Check weeks module distribution
SELECT 
    module,
    COUNT(*) as count,
    CASE 
        WHEN module IS NULL OR module = '' THEN '⚠️ NEEDS MODULE'
        ELSE '✅ OK'
    END as status
FROM weeks 
GROUP BY module 
ORDER BY 
    CASE WHEN module IS NULL OR module = '' THEN 0 ELSE 1 END,
    count DESC;

-- 4.2 Check resources module distribution
SELECT 
    module,
    is_public,
    COUNT(*) as count,
    CASE 
        WHEN (module IS NULL OR module = '') AND is_public = false THEN '⚠️ NEEDS MODULE OR PUBLIC FLAG'
        ELSE '✅ OK'
    END as status
FROM resources 
GROUP BY module, is_public 
ORDER BY count DESC;

-- 4.3 Check enrollments module distribution
SELECT 
    module,
    status,
    COUNT(*) as count
FROM enrollments 
GROUP BY module, status 
ORDER BY module, status;

-- 4.4 Check register module distribution
SELECT 
    module,
    payment_status,
    COUNT(*) as count
FROM register 
GROUP BY module, payment_status 
ORDER BY module, payment_status;

-- 4.5 Find weeks without modules (CRITICAL - needs fixing)
SELECT 
    week_id,
    title,
    order_num,
    module,
    '⚠️ NO MODULE ASSIGNED' as issue
FROM weeks 
WHERE module IS NULL OR module = ''
ORDER BY order_num, week_id;

-- 4.6 Find projects that belong to weeks without modules
SELECT 
    p.project_id,
    p.title as project_title,
    w.week_id,
    w.title as week_title,
    w.module as week_module,
    '⚠️ PROJECT WEEK HAS NO MODULE' as issue
FROM projects p
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY w.order_num, p.order_num;

-- 4.7 Find lessons in projects without module assignments
SELECT 
    l.lesson_id,
    l.title as lesson_title,
    p.project_id,
    p.title as project_title,
    w.title as week_title,
    w.module as week_module,
    '⚠️ LESSON WEEK HAS NO MODULE' as issue
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY w.order_num, p.order_num, l.order_num;

-- 4.8 Find assignments in content without module assignments
SELECT 
    a.assignment_id,
    a.title as assignment_title,
    CASE 
        WHEN a.project_id IS NOT NULL THEN 'Project'
        WHEN a.lesson_id IS NOT NULL THEN 'Lesson'
    END as assignment_type,
    w.module as week_module,
    '⚠️ ASSIGNMENT CONTENT HAS NO MODULE' as issue
FROM assignments a
LEFT JOIN projects p ON a.project_id = p.project_id
LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
LEFT JOIN projects p2 ON l.project_id = p2.project_id
LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY a.assignment_id;

-- 4.9 Find quizzes in content without module assignments
SELECT 
    q.quiz_id,
    q.title as quiz_title,
    CASE 
        WHEN q.project_id IS NOT NULL THEN 'Project'
        WHEN q.lesson_id IS NOT NULL THEN 'Lesson'
    END as quiz_type,
    w.module as week_module,
    '⚠️ QUIZ CONTENT HAS NO MODULE' as issue
FROM quizzes q
LEFT JOIN projects p ON q.project_id = p.project_id
LEFT JOIN lessons l ON q.lesson_id = l.lesson_id
LEFT JOIN projects p2 ON l.project_id = p2.project_id
LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY q.quiz_id;

-- 4.10 Find resources without module (not public)
SELECT 
    resource_id,
    type,
    title,
    module,
    is_public,
    '⚠️ RESOURCE HAS NO MODULE AND NOT PUBLIC' as issue
FROM resources
WHERE (module IS NULL OR module = '') AND is_public = false
ORDER BY type, title;

-- 4.11 Summary Statistics
SELECT 
    'Weeks' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as with_module,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as without_module
FROM weeks
UNION ALL
SELECT 
    'Resources' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' OR is_public = true THEN 1 END) as with_module_or_public,
    COUNT(CASE WHEN (module IS NULL OR module = '') AND is_public = false THEN 1 END) as without_module
FROM resources
UNION ALL
SELECT 
    'Enrollments' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as with_module,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as without_module
FROM enrollments
UNION ALL
SELECT 
    'Registrations' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as with_module,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as without_module
FROM register;
*/

-- STEP 5: Fix Common Issues
-- =====================================================

-- 5.1 If you have weeks without modules, you can set a default (CHANGE THIS TO YOUR NEEDS)
-- Uncomment and modify as needed:
/*
-- Example: Set default module for weeks without module
UPDATE weeks 
SET module = 'Electrical Design'  -- Change to your default module
WHERE module IS NULL OR module = ''
  AND week_id IN (
      -- List specific week_ids that should have this module
      -- Example: SELECT week_id FROM weeks WHERE title LIKE '%Electrical%'
  );
*/

-- STEP 6: Verification Query
-- =====================================================
-- Run this after fixes to verify everything is correct

SELECT 
    '✅ MODULE FIX COMPLETE' as status,
    COUNT(DISTINCT CASE WHEN w.module IS NOT NULL AND w.module != '' THEN w.week_id END) as weeks_with_module,
    COUNT(DISTINCT CASE WHEN r.module IS NOT NULL AND r.module != '' OR r.is_public = true THEN r.resource_id END) as resources_accessible,
    COUNT(DISTINCT CASE WHEN e.module IS NOT NULL AND e.module != '' THEN e.enrollment_id END) as enrollments_with_module
FROM weeks w
CROSS JOIN resources r
CROSS JOIN enrollments e
LIMIT 1;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. Weeks MUST have module assigned for content to show
-- 2. Resources should have module OR is_public = true
-- 3. All module names should be normalized to:
--    - "Electrical Design"
--    - "Plumbing & Mechanical Design (HVAC)"
--    - "MEP Design"
-- 4. Run the diagnostic queries (step 4) to see what needs fixing
-- 5. After assigning modules to weeks, all related content 
--    (projects, lessons, assignments, quizzes) will be accessible
-- =====================================================



















