-- ============================================
-- Get ALL Content for User's Enrolled Module
-- This query returns all weeks, projects, lessons, quizzes, assignments, and resources
-- for a specific user and their enrolled module
-- ============================================

-- OPTION 1: Detailed Query with All Relationships
-- Returns one row per content item combination
SELECT
  u.user_id,
  u.name AS user_name,
  u.email,
  e.module AS chosen_module,
  -- Week info
  w.week_id,
  w.title AS week_title,
  w.description AS week_description,
  -- Project info
  p.project_id,
  p.title AS project_title,
  p.short_description AS project_description,
  p.image_url AS project_image,
  p.video_url AS project_video,
  -- Lesson info
  l.lesson_id,
  l.title AS lesson_title,
  l.content AS lesson_content,
  l.file_url AS lesson_file,
  l.video_url AS lesson_video,
  -- Assignment info (check both project-linked AND lesson-linked)
  COALESCE(a_project.assignment_id, a_lesson.assignment_id) AS assignment_id,
  COALESCE(a_project.title, a_lesson.title) AS assignment_title,
  COALESCE(a_project.description, a_lesson.description) AS assignment_description,
  COALESCE(a_project.question_file_url, a_lesson.question_file_url) AS assignment_question_file,
  COALESCE(a_project.due_date, a_lesson.due_date) AS assignment_due_date,
  -- Resource info
  r.resource_id,
  r.title AS resource_title,
  r.type AS resource_type,
  r.file_url AS resource_file_url
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.weeks w ON w.module = e.module AND w.module IS NOT NULL AND w.module != ''
LEFT JOIN public.projects p ON (p.week_id = w.week_id) OR (p.module = e.module AND p.module IS NOT NULL AND p.module != '')
LEFT JOIN public.lessons l ON (l.project_id = p.project_id) OR (l.module = e.module AND l.module IS NOT NULL AND l.module != '')
-- Assignments linked to projects
LEFT JOIN public.assignments a_project ON a_project.project_id = p.project_id 
  AND a_project.is_active = true
  AND (a_project.module = e.module OR a_project.module IS NULL)
-- Assignments linked to lessons
LEFT JOIN public.assignments a_lesson ON a_lesson.lesson_id = l.lesson_id 
  AND a_lesson.is_active = true
  AND (a_lesson.module = e.module OR a_lesson.module IS NULL)
-- Resources matching the module
LEFT JOIN public.resources r ON (r.module = e.module AND r.module IS NOT NULL AND r.module != '') 
  OR (r.is_public = true)
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
ORDER BY
  w.week_id NULLS LAST,
  p.project_id NULLS LAST,
  l.lesson_id NULLS LAST,
  COALESCE(a_project.assignment_id, a_lesson.assignment_id) NULLS LAST;

-- ============================================
-- OPTION 2: Separate Queries for Each Content Type
-- Returns organized data by content type (RECOMMENDED)
-- ============================================

-- Get WEEKS for the module
SELECT
  w.week_id,
  w.title AS week_title,
  w.description AS week_description,
  w.order_num,
  w.module,
  COUNT(DISTINCT p.project_id) as project_count
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.weeks w ON w.module = e.module AND w.module IS NOT NULL AND w.module != ''
LEFT JOIN public.projects p ON p.week_id = w.week_id
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
GROUP BY w.week_id, w.title, w.description, w.order_num, w.module
ORDER BY w.order_num NULLS LAST, w.week_id;

-- Get PROJECTS for the module
SELECT
  p.project_id,
  p.title AS project_title,
  p.short_description AS project_description,
  p.image_url AS project_image,
  p.video_url AS project_video,
  p.order_num,
  w.week_id,
  w.title AS week_title,
  COUNT(DISTINCT l.lesson_id) as lesson_count
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.weeks w ON w.module = e.module AND w.module IS NOT NULL AND w.module != ''
LEFT JOIN public.projects p ON (p.week_id = w.week_id) OR (p.module = e.module AND p.module IS NOT NULL AND p.module != '')
LEFT JOIN public.lessons l ON l.project_id = p.project_id
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
  AND p.project_id IS NOT NULL
GROUP BY p.project_id, p.title, p.short_description, p.image_url, p.video_url, p.order_num, w.week_id, w.title
ORDER BY w.order_num NULLS LAST, p.order_num NULLS LAST;

-- Get LESSONS for the module
SELECT
  l.lesson_id,
  l.title AS lesson_title,
  l.content AS lesson_content,
  l.file_url AS lesson_file,
  l.video_url AS lesson_video,
  l.order_num,
  p.project_id,
  p.title AS project_title,
  w.week_id,
  w.title AS week_title
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.weeks w ON w.module = e.module AND w.module IS NOT NULL AND w.module != ''
LEFT JOIN public.projects p ON (p.week_id = w.week_id) OR (p.module = e.module AND p.module IS NOT NULL AND p.module != '')
LEFT JOIN public.lessons l ON (l.project_id = p.project_id) OR (l.module = e.module AND l.module IS NOT NULL AND l.module != '')
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
  AND l.lesson_id IS NOT NULL
ORDER BY w.order_num NULLS LAST, p.order_num NULLS LAST, l.order_num NULLS LAST;

-- Get ASSIGNMENTS for the module (both project-linked and lesson-linked)
SELECT
  a.assignment_id,
  a.title AS assignment_title,
  a.description AS assignment_description,
  a.question_file_url AS assignment_question_file,
  a.due_date AS assignment_due_date,
  a.project_id,
  a.lesson_id,
  p.title AS project_title,
  l.title AS lesson_title,
  w.week_id,
  w.title AS week_title,
  CASE 
    WHEN a.project_id IS NOT NULL THEN 'project'
    WHEN a.lesson_id IS NOT NULL THEN 'lesson'
  END AS assignment_type
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.weeks w ON w.module = e.module AND w.module IS NOT NULL AND w.module != ''
LEFT JOIN public.projects p ON (p.week_id = w.week_id) OR (p.module = e.module AND p.module IS NOT NULL AND p.module != '')
LEFT JOIN public.lessons l ON (l.project_id = p.project_id) OR (l.module = e.module AND l.module IS NOT NULL AND l.module != '')
LEFT JOIN public.assignments a ON (
  (a.project_id = p.project_id) OR 
  (a.lesson_id = l.lesson_id)
)
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
  AND a.assignment_id IS NOT NULL
  AND a.is_active = true
ORDER BY a.due_date NULLS LAST, a.assignment_id;

-- Get RESOURCES for the module (public + module-specific)
SELECT
  r.resource_id,
  r.title AS resource_title,
  r.type AS resource_type,
  r.file_url AS resource_file_url,
  r.module,
  r.is_public,
  CASE 
    WHEN r.is_public = true THEN 'public'
    WHEN r.module = 'Electrical Design' THEN 'module_specific'
  END AS resource_category
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.resources r ON (r.module = e.module AND r.module IS NOT NULL AND r.module != '') 
  OR (r.is_public = true)
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
  AND r.resource_id IS NOT NULL
ORDER BY r.type, r.title;

-- Get QUIZZES for the module
SELECT
  q.quiz_id,
  q.title AS quiz_title,
  q.description AS quiz_description,
  q.start_time,
  q.end_time,
  q.time_limit,
  q.project_id,
  q.lesson_id,
  p.title AS project_title,
  l.title AS lesson_title,
  w.week_id,
  w.title AS week_title
FROM public.users u
JOIN public.enrollments e ON u.user_id = e.user_id
LEFT JOIN public.weeks w ON w.module = e.module AND w.module IS NOT NULL AND w.module != ''
LEFT JOIN public.projects p ON (p.week_id = w.week_id) OR (p.module = e.module AND p.module IS NOT NULL AND p.module != '')
LEFT JOIN public.lessons l ON (l.project_id = p.project_id) OR (l.module = e.module AND l.module IS NOT NULL AND l.module != '')
LEFT JOIN public.quizzes q ON (
  (q.project_id = p.project_id) OR 
  (q.lesson_id = l.lesson_id)
)
WHERE
  u.user_id = 7
  AND u.email = 'uwihoreyefrancois12@gmail.com'
  AND e.module = 'Electrical Design'
  AND e.status = 'active'
  AND q.quiz_id IS NOT NULL
ORDER BY q.start_time NULLS LAST, q.quiz_id;




















