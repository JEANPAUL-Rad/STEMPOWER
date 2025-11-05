-- Fix module assignment issues
-- This script ensures that when a user registers for a module, all related content
-- (weeks, projects, lessons, quizzes, assignments, resources) are properly assigned

-- 1. First, ensure the registration process correctly links to modules
-- Update existing registrations to match module names with module IDs
UPDATE public.register r
SET module = m.name
FROM public.modules m
WHERE r.module ILIKE '%' || m.name || '%'
AND NOT EXISTS (SELECT 1 FROM public.modules WHERE name = r.module);

-- 2. Fix the enrollment process to correctly assign module_id
-- Update existing enrollments to link to modules based on the module name
UPDATE public.enrollments e
SET module_id = m.module_id
FROM public.modules m
WHERE e.module = m.name
AND e.module_id IS NULL;

-- 3. Create a more robust trigger function to handle module content assignment
CREATE OR REPLACE FUNCTION public.assign_module_content()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user enrolls in a module, ensure they get access to all content
  
  -- First, make sure they have a module_access entry
  INSERT INTO public.module_access (user_id, module_id, granted_at, expires_at, is_active)
  VALUES (NEW.user_id, NEW.module_id, NEW.enrolled_at, NEW.expires_at, NEW.status = 'active')
  ON CONFLICT (user_id, module_id) DO UPDATE
  SET expires_at = NEW.expires_at,
      is_active = (NEW.status = 'active');
  
  -- Create progress entries for all lessons in the module
  INSERT INTO public.progress (user_id, lesson_id, completed)
  SELECT NEW.user_id, l.lesson_id, FALSE
  FROM public.lessons l
  JOIN public.projects p ON l.project_id = p.project_id
  JOIN public.weeks w ON p.week_id = w.week_id
  WHERE w.module_id = NEW.module_id
  ON CONFLICT (user_id, lesson_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS enrollment_module_content_trigger ON public.enrollments;
CREATE TRIGGER enrollment_module_content_trigger
AFTER INSERT OR UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.assign_module_content();

-- 4. Create a function to ensure weeks are properly linked to modules
CREATE OR REPLACE FUNCTION public.ensure_module_weeks()
RETURNS TRIGGER AS $$
BEGIN
  -- When a module is created or updated, ensure it has at least one week
  -- This is a safeguard to make sure modules always have content
  IF NOT EXISTS (SELECT 1 FROM public.weeks WHERE module_id = NEW.module_id) THEN
    -- Create a default week if none exists
    INSERT INTO public.weeks (module_id, title, description, order_num)
    VALUES (NEW.module_id, 'Week 1', 'Default week for ' || NEW.name, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for module creation/update
DROP TRIGGER IF EXISTS ensure_module_weeks_trigger ON public.modules;
CREATE TRIGGER ensure_module_weeks_trigger
AFTER INSERT OR UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.ensure_module_weeks();

-- 5. Create a function to ensure projects are linked to weeks
CREATE OR REPLACE FUNCTION public.ensure_week_projects()
RETURNS TRIGGER AS $$
BEGIN
  -- When a week is created or updated, ensure it has at least one project
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE week_id = NEW.week_id) THEN
    -- Create a default project if none exists
    INSERT INTO public.projects (week_id, title, description, order_num)
    VALUES (NEW.week_id, 'Project 1', 'Default project for ' || NEW.title, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for week creation/update
DROP TRIGGER IF EXISTS ensure_week_projects_trigger ON public.weeks;
CREATE TRIGGER ensure_week_projects_trigger
AFTER INSERT OR UPDATE ON public.weeks
FOR EACH ROW
EXECUTE FUNCTION public.ensure_week_projects();

-- 6. Create a function to ensure lessons are linked to projects
CREATE OR REPLACE FUNCTION public.ensure_project_lessons()
RETURNS TRIGGER AS $$
BEGIN
  -- When a project is created or updated, ensure it has at least one lesson
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE project_id = NEW.project_id) THEN
    -- Create a default lesson if none exists
    INSERT INTO public.lessons (project_id, title, content, order_num)
    VALUES (NEW.project_id, 'Lesson 1', 'Default lesson for ' || NEW.title, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project creation/update
DROP TRIGGER IF EXISTS ensure_project_lessons_trigger ON public.projects;
CREATE TRIGGER ensure_project_lessons_trigger
AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.ensure_project_lessons();

-- 7. Fix any existing data issues
-- Ensure all weeks have a module_id
UPDATE public.weeks w
SET module_id = (SELECT module_id FROM public.modules ORDER BY module_id LIMIT 1)
WHERE module_id IS NULL;

-- Ensure all projects have a week_id
UPDATE public.projects p
SET week_id = (SELECT week_id FROM public.weeks ORDER BY week_id LIMIT 1)
WHERE week_id IS NULL;

-- Ensure all lessons have a project_id
UPDATE public.lessons l
SET project_id = (SELECT project_id FROM public.projects ORDER BY project_id LIMIT 1)
WHERE project_id IS NULL;

-- 8. Create a function to automatically populate module_access for existing users
CREATE OR REPLACE FUNCTION public.populate_module_access()
RETURNS void AS $$
BEGIN
  -- Create module_access entries for all enrollments that don't have one
  INSERT INTO public.module_access (user_id, module_id, granted_at, expires_at, is_active)
  SELECT e.user_id, e.module_id, e.enrolled_at, e.expires_at, e.status = 'active'
  FROM public.enrollments e
  WHERE e.module_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.module_access ma 
    WHERE ma.user_id = e.user_id AND ma.module_id = e.module_id
  );
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate module_access
SELECT public.populate_module_access();

-- 9. Create a function to populate progress entries for existing users
CREATE OR REPLACE FUNCTION public.populate_user_progress()
RETURNS void AS $$
BEGIN
  -- Create progress entries for all users and lessons they should have access to
  INSERT INTO public.progress (user_id, lesson_id, completed)
  SELECT ma.user_id, l.lesson_id, FALSE
  FROM public.module_access ma
  JOIN public.weeks w ON ma.module_id = w.module_id
  JOIN public.projects p ON w.week_id = p.week_id
  JOIN public.lessons l ON p.project_id = l.project_id
  WHERE ma.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.progress pr 
    WHERE pr.user_id = ma.user_id AND pr.lesson_id = l.lesson_id
  );
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate progress entries
SELECT public.populate_user_progress();

-- 10. Create a view to easily see all content assigned to a user
CREATE OR REPLACE VIEW public.user_assigned_content AS
SELECT 
  u.user_id,
  u.username,
  m.module_id,
  m.name AS module_name,
  w.week_id,
  w.title AS week_title,
  p.project_id,
  p.title AS project_title,
  l.lesson_id,
  l.title AS lesson_title,
  q.quiz_id,
  q.title AS quiz_title,
  a.assignment_id,
  a.title AS assignment_title,
  r.resource_id,
  r.title AS resource_title,
  pr.completed AS lesson_completed,
  pr.completed_at AS lesson_completed_at
FROM 
  public.users u
  JOIN public.module_access ma ON u.user_id = ma.user_id
  JOIN public.modules m ON ma.module_id = m.module_id
  JOIN public.weeks w ON m.module_id = w.module_id
  JOIN public.projects p ON w.week_id = p.week_id
  JOIN public.lessons l ON p.project_id = l.project_id
  LEFT JOIN public.quizzes q ON l.lesson_id = q.lesson_id
  LEFT JOIN public.assignments a ON (l.lesson_id = a.lesson_id OR p.project_id = a.project_id)
  LEFT JOIN public.resources r ON l.lesson_id = r.lesson_id
  LEFT JOIN public.progress pr ON u.user_id = pr.user_id AND l.lesson_id = pr.lesson_id
WHERE 
  ma.is_active = TRUE;

-- 11. Create a function to fix any missing relationships in the database
CREATE OR REPLACE FUNCTION public.fix_missing_relationships()
RETURNS void AS $$
BEGIN
  -- Fix any resources that don't have a lesson_id
  UPDATE public.resources r
  SET lesson_id = (
    SELECT l.lesson_id 
    FROM public.lessons l 
    JOIN public.projects p ON l.project_id = p.project_id
    WHERE p.project_id = r.project_id
    ORDER BY l.lesson_id 
    LIMIT 1
  )
  WHERE EXISTS (
    SELECT 1 FROM public.lessons l 
    JOIN public.projects p ON l.project_id = p.project_id
    WHERE p.project_id = r.project_id
  )
  AND r.lesson_id IS NULL;
  
  -- Fix any quizzes that don't have a lesson_id
  UPDATE public.quizzes q
  SET lesson_id = (
    SELECT l.lesson_id 
    FROM public.lessons l 
    ORDER BY l.lesson_id 
    LIMIT 1
  )
  WHERE q.lesson_id IS NULL;
  
  -- Fix any assignments that don't have a project_id or lesson_id
  UPDATE public.assignments a
  SET project_id = (
    SELECT p.project_id 
    FROM public.projects p 
    ORDER BY p.project_id 
    LIMIT 1
  )
  WHERE a.project_id IS NULL AND a.lesson_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix missing relationships
SELECT public.fix_missing_relationships();