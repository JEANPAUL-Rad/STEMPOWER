-- =====================================================
-- QUICK DIAGNOSTIC - Run this to see what's wrong
-- =====================================================

-- 1. Check if user has enrollment
-- Replace 'user@example.com' with actual user email
SELECT 
    'User Enrollment Check' as check_type,
    u.user_id,
    u.email,
    u.name,
    e.enrollment_id,
    e.module as enrolled_module,
    e.status as enrollment_status
FROM users u
LEFT JOIN enrollments e ON u.user_id = e.user_id AND e.status = 'active'
WHERE u.email = 'user@example.com';  -- CHANGE THIS EMAIL!

-- 2. Check if weeks have modules
SELECT 
    'Weeks Module Check' as check_type,
    COUNT(*) as total_weeks,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as weeks_with_module,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as weeks_without_module
FROM weeks;

-- 3. Show weeks without modules
SELECT 
    week_id,
    title,
    module,
    order_num
FROM weeks 
WHERE module IS NULL OR module = ''
ORDER BY week_id;

-- 4. Show module distribution in weeks
SELECT 
    module,
    COUNT(*) as week_count
FROM weeks 
WHERE module IS NOT NULL AND module != ''
GROUP BY module
ORDER BY week_count DESC;

-- 5. Check if there are projects in weeks with modules
SELECT 
    'Projects Check' as check_type,
    COUNT(DISTINCT p.project_id) as total_projects,
    COUNT(DISTINCT CASE WHEN w.module IS NOT NULL AND w.module != '' THEN p.project_id END) as projects_in_weeks_with_modules,
    COUNT(DISTINCT CASE WHEN w.module IS NULL OR w.module = '' THEN p.project_id END) as projects_in_weeks_without_modules
FROM projects p
JOIN weeks w ON p.week_id = w.week_id;

-- 6. Quick fix: Assign all NULL weeks to a module (ADJUST AS NEEDED!)
-- UNCOMMENT AND RUN THIS ONLY IF YOU WANT TO ASSIGN ALL WEEKS TO ONE MODULE
/*
UPDATE weeks 
SET module = 'Electrical Design'  -- Change to: 'MEP Design' or 'Plumbing & Mechanical Design (HVAC)'
WHERE module IS NULL OR module = '';
*/





