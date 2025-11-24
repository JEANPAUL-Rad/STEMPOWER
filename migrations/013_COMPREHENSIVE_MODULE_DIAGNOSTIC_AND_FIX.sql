-- =====================================================
-- COMPREHENSIVE MODULE DIAGNOSTIC AND FIX SCRIPT
-- This script diagnoses and fixes all module-related issues
-- =====================================================

-- STEP 1: DIAGNOSTIC QUERIES
-- =====================================================

-- 1.1 Check enrollments
SELECT 
    'ENROLLMENTS' as check_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN module IS NOT NULL THEN 1 END) as with_module_count
FROM enrollments;

-- 1.2 Check weeks with/without modules
SELECT 
    'WEEKS' as check_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as with_module_count,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as without_module_count
FROM weeks;

-- 1.3 Check resources with/without modules or public flag
SELECT 
    'RESOURCES' as check_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as with_module_count,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_count,
    COUNT(CASE WHEN (module IS NULL OR module = '') AND (is_public IS NULL OR is_public = false) THEN 1 END) as inaccessible_count
FROM resources;

-- 1.4 Show module distribution in weeks
SELECT 
    module,
    COUNT(*) as week_count
FROM weeks 
WHERE module IS NOT NULL AND module != ''
GROUP BY module
ORDER BY week_count DESC;

-- 1.5 Show module distribution in enrollments
SELECT 
    module,
    status,
    COUNT(*) as enrollment_count
FROM enrollments 
WHERE module IS NOT NULL
GROUP BY module, status
ORDER BY module, status;

-- 1.6 Find orphaned projects (projects in weeks without modules)
SELECT 
    p.project_id,
    p.title as project_title,
    w.week_id,
    w.title as week_title,
    w.module as week_module
FROM projects p
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY w.week_id, p.project_id;

-- 1.7 Find orphaned lessons (lessons in projects that are in weeks without modules)
SELECT 
    l.lesson_id,
    l.title as lesson_title,
    p.project_id,
    p.title as project_title,
    w.module as week_module
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY w.week_id, p.project_id, l.lesson_id;

-- 1.8 Find orphaned assignments (assignments in projects/lessons without module linkage)
SELECT 
    a.assignment_id,
    a.title as assignment_title,
    a.project_id,
    a.lesson_id,
    COALESCE(
        (SELECT w.module FROM projects p JOIN weeks w ON p.week_id = w.week_id WHERE p.project_id = a.project_id),
        (SELECT w.module FROM lessons l JOIN projects p ON l.project_id = p.project_id JOIN weeks w ON p.week_id = w.week_id WHERE l.lesson_id = a.lesson_id)
    ) as linked_module
FROM assignments a
WHERE (
    (a.project_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM projects p JOIN weeks w ON p.week_id = w.week_id 
        WHERE p.project_id = a.project_id AND w.module IS NOT NULL AND w.module != ''
    ))
    OR
    (a.lesson_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM lessons l 
        JOIN projects p ON l.project_id = p.project_id 
        JOIN weeks w ON p.week_id = w.week_id 
        WHERE l.lesson_id = a.lesson_id AND w.module IS NOT NULL AND w.module != ''
    ))
)
ORDER BY a.assignment_id;

-- 1.9 Find orphaned quizzes (quizzes in projects without module linkage)
SELECT 
    q.quiz_id,
    q.title as quiz_title,
    q.project_id,
    q.lesson_id,
    COALESCE(
        (SELECT w.module FROM projects p JOIN weeks w ON p.week_id = w.week_id WHERE p.project_id = q.project_id),
        (SELECT w.module FROM lessons l JOIN projects p ON l.project_id = p.project_id JOIN weeks w ON p.week_id = w.week_id WHERE l.lesson_id = q.lesson_id)
    ) as linked_module
FROM quizzes q
WHERE (
    (q.project_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM projects p JOIN weeks w ON p.week_id = w.week_id 
        WHERE p.project_id = q.project_id AND w.module IS NOT NULL AND w.module != ''
    ))
    OR
    (q.lesson_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM lessons l 
        JOIN projects p ON l.project_id = p.project_id 
        JOIN weeks w ON p.week_id = w.week_id 
        WHERE l.lesson_id = q.lesson_id AND w.module IS NOT NULL AND w.module != ''
    ))
)
ORDER BY q.quiz_id;

-- STEP 2: NORMALIZE MODULE NAMES
-- =====================================================

-- 2.1 Normalize weeks.module
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
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- 2.2 Normalize resources.module
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
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- 2.3 Normalize register.module
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
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- 2.4 Normalize enrollments.module
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
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- STEP 3: CREATE MISSING ENROLLMENTS FOR PAID REGISTRATIONS
-- =====================================================

-- 3.1 Create enrollments for paid registrations that don't have enrollments
INSERT INTO enrollments (user_id, registration_id, module, status)
SELECT DISTINCT
    r.user_id,
    r.id,
    r.module,
    'active'
FROM register r
WHERE r.payment_status = 'Paid'
  AND r.module IS NOT NULL
  AND r.module != ''
  AND r.user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = r.user_id 
        AND e.module = r.module 
        AND e.status = 'active'
  );

-- STEP 4: SUMMARY REPORT
-- =====================================================

SELECT '=== DIAGNOSTIC COMPLETE ===' as status;

-- Show final state
SELECT 
    'Final State - Weeks' as report_section,
    COUNT(*) as total_weeks,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as weeks_with_module,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as weeks_without_module
FROM weeks;

SELECT 
    'Final State - Enrollments' as report_section,
    COUNT(*) as total_enrollments,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
    COUNT(DISTINCT module) as unique_modules
FROM enrollments;

SELECT 
    'Final State - Resources' as report_section,
    COUNT(*) as total_resources,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as module_specific,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_resources
FROM resources;

-- =====================================================
-- IMPORTANT: After running this script, you MUST manually
-- assign modules to weeks that are still NULL.
-- Use the Admin Dashboard → Weeks Management to assign modules.
-- =====================================================




















