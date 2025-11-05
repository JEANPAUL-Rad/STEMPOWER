-- ============================================
-- COMPLETE MODULE ASSIGNMENT - Run All Steps
-- This will assign modules to all content based on relationships
-- ============================================

-- STEP 2: Assign modules to LESSONS
UPDATE lessons l
SET module = COALESCE(p.module, w.module)
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE l.project_id = p.project_id
  AND (p.module IS NOT NULL OR w.module IS NOT NULL)
  AND (l.module IS NULL OR l.module = '');

-- STEP 3: Assign modules to QUIZZES
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

-- STEP 4: Assign modules to ASSIGNMENTS
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

-- ============================================
-- FINAL VERIFICATION - See All Content by Module
-- ============================================
SELECT 
    module,
    COUNT(DISTINCT w.week_id) as weeks,
    COUNT(DISTINCT p.project_id) as projects,
    COUNT(DISTINCT l.lesson_id) as lessons,
    COUNT(DISTINCT q.quiz_id) as quizzes,
    COUNT(DISTINCT a.assignment_id) as assignments,
    COUNT(DISTINCT r.resource_id) as resources
FROM weeks w
LEFT JOIN projects p ON w.week_id = p.week_id
LEFT JOIN lessons l ON p.project_id = l.project_id
LEFT JOIN quizzes q ON (q.project_id = p.project_id OR q.lesson_id = l.lesson_id)
LEFT JOIN assignments a ON (a.project_id = p.project_id OR a.lesson_id = l.lesson_id)
LEFT JOIN resources r ON r.module = w.module
WHERE w.module IS NOT NULL AND w.module != ''
GROUP BY w.module
ORDER BY w.module;



