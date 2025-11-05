-- =====================================================
-- DIAGNOSTIC QUERIES FOR MODULE CONTENT ISSUES
-- Run these queries to identify why content is not showing
-- =====================================================

-- QUERY 1: Check if user has enrollment/registration
-- Replace USER_EMAIL with actual user email or USER_ID with user_id
-- =====================================================
SELECT 
    'Enrollments' as source,
    e.enrollment_id,
    e.user_id,
    e.module,
    e.status,
    e.enrolled_at,
    u.email,
    u.name
FROM enrollments e
JOIN users u ON e.user_id = u.user_id
WHERE u.email = 'USER_EMAIL'  -- REPLACE WITH ACTUAL EMAIL
   OR e.user_id = USER_ID     -- REPLACE WITH ACTUAL USER_ID
ORDER BY e.enrolled_at DESC;

SELECT 
    'Registrations' as source,
    r.id as registration_id,
    r.user_id,
    r.module,
    r.payment_status,
    r.created_at,
    r.email_address,
    r.full_name
FROM register r
WHERE r.email_address = 'USER_EMAIL'  -- REPLACE WITH ACTUAL EMAIL
   OR r.user_id = USER_ID             -- REPLACE WITH ACTUAL USER_ID
ORDER BY r.created_at DESC;

-- QUERY 2: Check what modules exist in weeks table
-- =====================================================
SELECT 
    module,
    COUNT(*) as total_weeks,
    STRING_AGG(DISTINCT title, ', ' ORDER BY title) as week_titles
FROM weeks 
WHERE module IS NOT NULL AND module != ''
GROUP BY module
ORDER BY module;

-- QUERY 3: Check if weeks have modules assigned
-- =====================================================
SELECT 
    CASE 
        WHEN module IS NULL OR module = '' THEN '❌ NO MODULE'
        ELSE '✅ HAS MODULE'
    END as status,
    COUNT(*) as count
FROM weeks
GROUP BY 
    CASE 
        WHEN module IS NULL OR module = '' THEN '❌ NO MODULE'
        ELSE '✅ HAS MODULE'
    END;

-- QUERY 4: Find weeks without modules (NEEDS FIXING)
-- =====================================================
SELECT 
    week_id,
    title,
    order_num,
    module,
    '⚠️ ASSIGN MODULE TO THIS WEEK' as action_needed
FROM weeks 
WHERE module IS NULL OR module = ''
ORDER BY order_num, week_id;

-- QUERY 5: Check module content breakdown
-- =====================================================
SELECT 
    w.module,
    COUNT(DISTINCT w.week_id) as total_weeks,
    COUNT(DISTINCT p.project_id) as total_projects,
    COUNT(DISTINCT l.lesson_id) as total_lessons,
    COUNT(DISTINCT q.quiz_id) as total_quizzes,
    COUNT(DISTINCT a.assignment_id) as total_assignments
FROM weeks w
LEFT JOIN projects p ON w.week_id = p.week_id
LEFT JOIN lessons l ON p.project_id = l.project_id
LEFT JOIN quizzes q ON (q.project_id = p.project_id OR q.lesson_id = l.lesson_id)
LEFT JOIN assignments a ON (a.project_id = p.project_id OR a.lesson_id = l.lesson_id)
WHERE w.module IS NOT NULL AND w.module != ''
GROUP BY w.module
ORDER BY w.module;

-- QUERY 6: Check resources by module
-- =====================================================
SELECT 
    module,
    is_public,
    type,
    COUNT(*) as count
FROM resources
GROUP BY module, is_public, type
ORDER BY module, is_public, type;

-- QUERY 7: Verify module name consistency
-- =====================================================
SELECT 
    'weeks' as table_name,
    module,
    COUNT(*) as count
FROM weeks
WHERE module IS NOT NULL AND module != ''
GROUP BY module
UNION ALL
SELECT 
    'enrollments' as table_name,
    module,
    COUNT(*) as count
FROM enrollments
WHERE module IS NOT NULL AND module != ''
GROUP BY module
UNION ALL
SELECT 
    'register' as table_name,
    module,
    COUNT(*) as count
FROM register
WHERE module IS NOT NULL AND module != ''
GROUP BY module
UNION ALL
SELECT 
    'resources' as table_name,
    module,
    COUNT(*) as count
FROM resources
WHERE module IS NOT NULL AND module != ''
GROUP BY module
ORDER BY table_name, module;

-- QUERY 8: Find content not linked to any module
-- =====================================================
-- Projects without module (through weeks)
SELECT 
    'Projects' as content_type,
    p.project_id,
    p.title,
    w.module as week_module,
    '⚠️ PROJECT WEEK HAS NO MODULE' as issue
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY p.project_id
LIMIT 20;

-- Lessons without module
SELECT 
    'Lessons' as content_type,
    l.lesson_id,
    l.title,
    w.module as week_module,
    '⚠️ LESSON WEEK HAS NO MODULE' as issue
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = ''
ORDER BY l.lesson_id
LIMIT 20;

-- QUERY 9: Quick fix - Assign default module to weeks without module
-- UNCOMMENT AND MODIFY AS NEEDED:
-- =====================================================
/*
-- Example: Assign "Electrical Design" to weeks 1-5
UPDATE weeks 
SET module = 'Electrical Design'
WHERE week_id IN (1, 2, 3, 4, 5)
  AND (module IS NULL OR module = '');

-- Example: Assign "MEP Design" to weeks 6-10
UPDATE weeks 
SET module = 'MEP Design'
WHERE week_id IN (6, 7, 8, 9, 10)
  AND (module IS NULL OR module = '');

-- Example: Assign "Plumbing & Mechanical Design (HVAC)" to weeks 11-15
UPDATE weeks 
SET module = 'Plumbing & Mechanical Design (HVAC)'
WHERE week_id IN (11, 12, 13, 14, 15)
  AND (module IS NULL OR module = '');
*/

-- QUERY 10: Summary report for troubleshooting
-- =====================================================
SELECT 
    'SUMMARY REPORT' as report_section,
    (SELECT COUNT(*) FROM weeks WHERE module IS NOT NULL AND module != '') as weeks_with_module,
    (SELECT COUNT(*) FROM weeks WHERE module IS NULL OR module = '') as weeks_without_module,
    (SELECT COUNT(DISTINCT module) FROM weeks WHERE module IS NOT NULL AND module != '') as unique_modules_in_weeks,
    (SELECT COUNT(*) FROM enrollments WHERE status = 'active') as active_enrollments,
    (SELECT COUNT(*) FROM register WHERE payment_status = 'Paid' AND module IS NOT NULL) as paid_registrations_with_module;




