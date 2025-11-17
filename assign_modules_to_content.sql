-- Assign Modules to Content Based on Relationships
-- This script assigns modules to projects, lessons, quizzes, and resources
-- based on their relationships with weeks that have modules assigned

-- ============================================
-- STEP 1: Assign modules to PROJECTS
-- Projects get module from their parent week
-- ============================================
UPDATE projects p
SET module = w.module
FROM weeks w
WHERE p.week_id = w.week_id
  AND w.module IS NOT NULL
  AND w.module != ''
  AND (p.module IS NULL OR p.module = '');

-- Verify projects now have modules
SELECT 
    'projects' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module = 'Electrical Design' THEN 1 END) as electrical_design,
    COUNT(CASE WHEN module = 'MEP Design' THEN 1 END) as mep_design,
    COUNT(CASE WHEN module = 'Plumbing & Mechanical Design (HVAC)' THEN 1 END) as hvac_design
FROM projects;

-- ============================================
-- STEP 2: Assign modules to LESSONS
-- Lessons get module from their parent project (or project's week)
-- ============================================
UPDATE lessons l
SET module = COALESCE(p.module, w.module)
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE l.project_id = p.project_id
  AND (p.module IS NOT NULL OR w.module IS NOT NULL)
  AND (l.module IS NULL OR l.module = '');

-- Verify lessons now have modules
SELECT 
    'lessons' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module = 'Electrical Design' THEN 1 END) as electrical_design,
    COUNT(CASE WHEN module = 'MEP Design' THEN 1 END) as mep_design,
    COUNT(CASE WHEN module = 'Plumbing & Mechanical Design (HVAC)' THEN 1 END) as hvac_design
FROM lessons;

-- ============================================
-- STEP 3: Assign modules to QUIZZES
-- Quizzes get module from their project or lesson's project
-- ============================================
-- For quizzes linked to projects
UPDATE quizzes q
SET module = COALESCE(p.module, w.module)
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE q.project_id = p.project_id
  AND q.lesson_id IS NULL
  AND (p.module IS NOT NULL OR w.module IS NOT NULL)
  AND (q.module IS NULL OR q.module = '');

-- For quizzes linked to lessons
UPDATE quizzes q
SET module = COALESCE(l.module, p.module, w.module)
FROM lessons l
LEFT JOIN projects p ON l.project_id = p.project_id
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE q.lesson_id = l.lesson_id
  AND (l.module IS NOT NULL OR p.module IS NOT NULL OR w.module IS NOT NULL)
  AND (q.module IS NULL OR q.module = '');

-- Verify quizzes now have modules
SELECT 
    'quizzes' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module = 'Electrical Design' THEN 1 END) as electrical_design,
    COUNT(CASE WHEN module = 'MEP Design' THEN 1 END) as mep_design,
    COUNT(CASE WHEN module = 'Plumbing & Mechanical Design (HVAC)' THEN 1 END) as hvac_design
FROM quizzes;

-- ============================================
-- STEP 4: Assign modules to ASSIGNMENTS
-- Assignments get module from their project or lesson's project
-- ============================================
-- For assignments linked to projects
UPDATE assignments a
SET module = COALESCE(p.module, w.module)
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE a.project_id = p.project_id
  AND a.lesson_id IS NULL
  AND (p.module IS NOT NULL OR w.module IS NOT NULL)
  AND (a.module IS NULL OR a.module = '');

-- For assignments linked to lessons
UPDATE assignments a
SET module = COALESCE(l.module, p.module, w.module)
FROM lessons l
LEFT JOIN projects p ON l.project_id = p.project_id
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE a.lesson_id = l.lesson_id
  AND (l.module IS NOT NULL OR p.module IS NOT NULL OR w.module IS NOT NULL)
  AND (a.module IS NULL OR a.module = '');

-- Verify assignments now have modules
SELECT 
    'assignments' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module = 'Electrical Design' AND is_active = true THEN 1 END) as electrical_design_active,
    COUNT(CASE WHEN module = 'MEP Design' AND is_active = true THEN 1 END) as mep_design_active,
    COUNT(CASE WHEN module = 'Plumbing & Mechanical Design (HVAC)' AND is_active = true THEN 1 END) as hvac_design_active
FROM assignments;

-- ============================================
-- STEP 5: Assign modules to RESOURCES (Optional)
-- Resources should be assigned manually or set as public
-- This step assigns module to resources that don't have one
-- Note: You may want to keep some resources as public (is_public = true)
-- ============================================
-- Only update resources that don't have a module AND aren't public
-- Comment this out if you want to manage resources manually
/*
UPDATE resources r
SET module = (
    SELECT w.module 
    FROM weeks w 
    WHERE w.module IS NOT NULL 
    LIMIT 1
)
WHERE (r.module IS NULL OR r.module = '')
  AND (r.is_public = false OR r.is_public IS NULL);
*/

-- ============================================
-- FINAL VERIFICATION: Check all content has modules
-- ============================================
SELECT 
    'weeks' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as with_module
FROM weeks
UNION ALL
SELECT 
    'projects',
    COUNT(*),
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END)
FROM projects
UNION ALL
SELECT 
    'lessons',
    COUNT(*),
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END)
FROM lessons
UNION ALL
SELECT 
    'quizzes',
    COUNT(*),
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END)
FROM quizzes
UNION ALL
SELECT 
    'assignments',
    COUNT(*),
    COUNT(CASE WHEN module IS NOT NULL AND module != '' AND is_active = true THEN 1 END)
FROM assignments
UNION ALL
SELECT 
    'resources',
    COUNT(*),
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END)
FROM resources;

-- ============================================
-- MODULE BREAKDOWN BY CONTENT TYPE
-- ============================================
SELECT 
    'Electrical Design' as module,
    (SELECT COUNT(*) FROM weeks WHERE module = 'Electrical Design') as weeks,
    (SELECT COUNT(*) FROM projects WHERE module = 'Electrical Design') as projects,
    (SELECT COUNT(*) FROM lessons WHERE module = 'Electrical Design') as lessons,
    (SELECT COUNT(*) FROM quizzes WHERE module = 'Electrical Design') as quizzes,
    (SELECT COUNT(*) FROM assignments WHERE module = 'Electrical Design' AND is_active = true) as assignments,
    (SELECT COUNT(*) FROM resources WHERE module = 'Electrical Design') as resources
UNION ALL
SELECT 
    'MEP Design',
    (SELECT COUNT(*) FROM weeks WHERE module = 'MEP Design'),
    (SELECT COUNT(*) FROM projects WHERE module = 'MEP Design'),
    (SELECT COUNT(*) FROM lessons WHERE module = 'MEP Design'),
    (SELECT COUNT(*) FROM quizzes WHERE module = 'MEP Design'),
    (SELECT COUNT(*) FROM assignments WHERE module = 'MEP Design' AND is_active = true),
    (SELECT COUNT(*) FROM resources WHERE module = 'MEP Design')
UNION ALL
SELECT 
    'Plumbing & Mechanical Design (HVAC)',
    (SELECT COUNT(*) FROM weeks WHERE module = 'Plumbing & Mechanical Design (HVAC)'),
    (SELECT COUNT(*) FROM projects WHERE module = 'Plumbing & Mechanical Design (HVAC)'),
    (SELECT COUNT(*) FROM lessons WHERE module = 'Plumbing & Mechanical Design (HVAC)'),
    (SELECT COUNT(*) FROM quizzes WHERE module = 'Plumbing & Mechanical Design (HVAC)'),
    (SELECT COUNT(*) FROM assignments WHERE module = 'Plumbing & Mechanical Design (HVAC)' AND is_active = true),
    (SELECT COUNT(*) FROM resources WHERE module = 'Plumbing & Mechanical Design (HVAC)');















