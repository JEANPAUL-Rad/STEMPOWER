-- Comprehensive Database Fix Script
-- This script fixes all issues with module assignment and content access

-- First, create all base tables in the correct dependency order
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL UNIQUE,
  password_hash VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'student',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create register table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.register (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  phone VARCHAR NOT NULL,
  module VARCHAR NOT NULL,
  payment_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create modules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.modules (
  module_id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  duration_weeks INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create weeks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.weeks (
  week_id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT weeks_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id)
);

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.projects (
  project_id SERIAL PRIMARY KEY,
  week_id INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT projects_week_id_fkey FOREIGN KEY (week_id) REFERENCES public.weeks(week_id)
);

-- Create lessons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lessons (
  lesson_id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  parent_lesson_id INTEGER,
  title VARCHAR NOT NULL,
  content TEXT,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  file_url TEXT,
  upload_image VARCHAR,
  video_url VARCHAR,
  CONSTRAINT lessons_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id)
);

-- Add self-reference to lessons table after it's created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_parent_lesson_id_fkey'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_parent_lesson_id_fkey 
      FOREIGN KEY (parent_lesson_id) REFERENCES public.lessons(lesson_id);
  END IF;
END $$;

-- Add denormalized 'module' columns and keep them in sync
-- Add columns if they don't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS module VARCHAR;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module VARCHAR;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS module VARCHAR;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS module VARCHAR;

-- Backfill module values for existing rows
-- Projects -> Weeks -> Modules
UPDATE public.projects p
SET module = m.name
FROM public.weeks w
JOIN public.modules m ON w.module_id = m.module_id
WHERE p.week_id = w.week_id;

-- Lessons -> Projects -> Weeks -> Modules
UPDATE public.lessons l
SET module = m.name
FROM public.projects p
JOIN public.weeks w ON p.week_id = w.week_id
JOIN public.modules m ON w.module_id = m.module_id
WHERE l.project_id = p.project_id;

-- Assignments via lesson chain (preferred)
UPDATE public.assignments a
SET module = m.name
FROM public.lessons l
JOIN public.projects p ON l.project_id = p.project_id
JOIN public.weeks w ON p.week_id = w.week_id
JOIN public.modules m ON w.module_id = m.module_id
WHERE a.lesson_id = l.lesson_id;

-- Assignments via project when lesson_id is NULL
UPDATE public.assignments a
SET module = m.name
FROM public.projects p
JOIN public.weeks w ON p.week_id = w.week_id
JOIN public.modules m ON w.module_id = m.module_id
WHERE a.project_id = p.project_id AND a.lesson_id IS NULL;

-- Quizzes -> Lessons -> Projects -> Weeks -> Modules
UPDATE public.quizzes q
SET module = m.name
FROM public.lessons l
JOIN public.projects p ON l.project_id = p.project_id
JOIN public.weeks w ON p.week_id = w.week_id
JOIN public.modules m ON w.module_id = m.module_id
WHERE q.lesson_id = l.lesson_id;

-- Create sync functions and triggers to keep 'module' columns updated
-- Sync project.module from its week -> module
CREATE OR REPLACE FUNCTION public.sync_project_module()
RETURNS TRIGGER AS $$
BEGIN
  NEW.module := (
    SELECT m.name
    FROM public.weeks w
    JOIN public.modules m ON w.module_id = m.module_id
    WHERE w.week_id = NEW.week_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_project_module_trigger ON public.projects;
CREATE TRIGGER sync_project_module_trigger
AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_module();

-- Sync lesson.module from its project -> week -> module
CREATE OR REPLACE FUNCTION public.sync_lesson_module()
RETURNS TRIGGER AS $$
BEGIN
  NEW.module := (
    SELECT m.name
    FROM public.projects p
    JOIN public.weeks w ON p.week_id = w.week_id
    JOIN public.modules m ON w.module_id = m.module_id
    WHERE p.project_id = NEW.project_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_lesson_module_trigger ON public.lessons;
CREATE TRIGGER sync_lesson_module_trigger
AFTER INSERT OR UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.sync_lesson_module();

-- Sync assignment.module from lesson (if present) else from project
CREATE OR REPLACE FUNCTION public.sync_assignment_module()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lesson_id IS NOT NULL THEN
    NEW.module := (
      SELECT m.name
      FROM public.lessons l
      JOIN public.projects p ON l.project_id = p.project_id
      JOIN public.weeks w ON p.week_id = w.week_id
      JOIN public.modules m ON w.module_id = m.module_id
      WHERE l.lesson_id = NEW.lesson_id
    );
  ELSIF NEW.project_id IS NOT NULL THEN
    NEW.module := (
      SELECT m.name
      FROM public.projects p
      JOIN public.weeks w ON p.week_id = w.week_id
      JOIN public.modules m ON w.module_id = m.module_id
      WHERE p.project_id = NEW.project_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_assignment_module_trigger ON public.assignments;
CREATE TRIGGER sync_assignment_module_trigger
AFTER INSERT OR UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.sync_assignment_module();

-- Sync quiz.module from its lesson -> project -> week -> module
CREATE OR REPLACE FUNCTION public.sync_quiz_module()
RETURNS TRIGGER AS $$
BEGIN
  NEW.module := (
    SELECT m.name
    FROM public.lessons l
    JOIN public.projects p ON l.project_id = p.project_id
    JOIN public.weeks w ON p.week_id = w.week_id
    JOIN public.modules m ON w.module_id = m.module_id
    WHERE l.lesson_id = NEW.lesson_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_quiz_module_trigger ON public.quizzes;
CREATE TRIGGER sync_quiz_module_trigger
AFTER INSERT OR UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.sync_quiz_module();

-- Ensure cascading deletes for key relationships
-- Projects -> Weeks (cascade) using user's constraint name for compatibility
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_week_module_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_week_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_week_module_fkey
  FOREIGN KEY (week_id) REFERENCES public.weeks(week_id) ON DELETE CASCADE;

-- Lessons -> Projects (cascade) using user's constraint name for compatibility
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_project_module_fkey;
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_project_id_fkey;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_project_module_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;

-- Create quizzes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quizzes (
  quiz_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  passing_score INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id)
);

-- Create resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resources (
  resource_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type VARCHAR,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT resources_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id)
);

-- Create enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  registration_id INTEGER,
  module_id INTEGER NOT NULL,
  module VARCHAR NOT NULL,
  enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT enrollments_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.register(id),
  CONSTRAINT enrollments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id)
);

-- Create assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.assignments (
  assignment_id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  lesson_id INTEGER,
  title VARCHAR NOT NULL,
  description TEXT,
  question_file_url TEXT NOT NULL,
  question_file_name VARCHAR,
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT DEFAULT 'pdf,doc,docx,txt',
  due_date TIMESTAMP WITHOUT TIME ZONE,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id),
  CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- Create progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.progress (
  progress_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  CONSTRAINT progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id),
  UNIQUE(user_id, lesson_id)
);

-- Create module_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.module_access (
  access_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL,
  granted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, module_id),
  CONSTRAINT module_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT module_access_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id)
);

-- Now fix registration and enrollment relationships
-- Update existing registrations to match module names with module IDs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules' AND table_schema = 'public') THEN
    UPDATE public.register r
    SET module = m.name
    FROM public.modules m
    WHERE r.module ILIKE '%' || m.name || '%'
    AND NOT EXISTS (SELECT 1 FROM public.modules WHERE name = r.module);
  END IF;
END $$;

-- Fix the enrollment process to correctly assign module_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments' AND table_schema = 'public') 
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules' AND table_schema = 'public') THEN
    UPDATE public.enrollments e
    SET module_id = m.module_id
    FROM public.modules m
    WHERE e.module = m.name
    AND e.module_id IS NULL;
  END IF;
END $$;

-- Create a robust trigger function to handle module content assignment
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

-- Fix data integrity with cascading triggers
-- Ensure modules have weeks
CREATE OR REPLACE FUNCTION public.ensure_module_weeks()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.weeks WHERE module_id = NEW.module_id) THEN
    INSERT INTO public.weeks (module_id, title, description, order_num)
    VALUES (NEW.module_id, 'Week 1', 'Default week for ' || NEW.name, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_module_weeks_trigger ON public.modules;
CREATE TRIGGER ensure_module_weeks_trigger
AFTER INSERT OR UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.ensure_module_weeks();

-- Ensure weeks have projects
CREATE OR REPLACE FUNCTION public.ensure_week_projects()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE week_id = NEW.week_id) THEN
    INSERT INTO public.projects (week_id, title, description, order_num)
    VALUES (NEW.week_id, 'Project 1', 'Default project for ' || NEW.title, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_week_projects_trigger ON public.weeks;
CREATE TRIGGER ensure_week_projects_trigger
AFTER INSERT OR UPDATE ON public.weeks
FOR EACH ROW
EXECUTE FUNCTION public.ensure_week_projects();

-- Ensure projects have lessons
CREATE OR REPLACE FUNCTION public.ensure_project_lessons()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE project_id = NEW.project_id) THEN
    INSERT INTO public.lessons (project_id, title, content, order_num)
    VALUES (NEW.project_id, 'Lesson 1', 'Default lesson for ' || NEW.title, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_project_lessons_trigger ON public.projects;
CREATE TRIGGER ensure_project_lessons_trigger
AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.ensure_project_lessons();

-- Fix existing data issues with safety checks
-- Ensure all weeks have a module_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weeks' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM public.modules) THEN
    UPDATE public.weeks w
    SET module_id = (SELECT module_id FROM public.modules ORDER BY module_id LIMIT 1)
    WHERE module_id IS NULL;
  END IF;
END $$;

-- Ensure all projects have a week_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weeks' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM public.weeks) THEN
    UPDATE public.projects p
    SET week_id = (SELECT week_id FROM public.weeks ORDER BY week_id LIMIT 1)
    WHERE week_id IS NULL;
  END IF;
END $$;

-- Ensure all lessons have a project_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM public.projects) THEN
    UPDATE public.lessons l
    SET project_id = (SELECT project_id FROM public.projects ORDER BY project_id LIMIT 1)
    WHERE project_id IS NULL;
  END IF;
END $$;

-- Fix any resources that don't have a lesson_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM public.lessons) THEN
    UPDATE public.resources r
    SET lesson_id = (
      SELECT l.lesson_id 
      FROM public.lessons l 
      ORDER BY l.lesson_id 
      LIMIT 1
    )
    WHERE r.lesson_id IS NULL;
  END IF;
END $$;

-- Fix any quizzes that don't have a lesson_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quizzes' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM public.lessons) THEN
    UPDATE public.quizzes q
    SET lesson_id = (
      SELECT l.lesson_id 
      FROM public.lessons l 
      ORDER BY l.lesson_id 
      LIMIT 1
    )
    WHERE q.lesson_id IS NULL;
  END IF;
END $$;

-- Fix any assignments that don't have a project_id or lesson_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM public.projects) THEN
    UPDATE public.assignments a
    SET project_id = (
      SELECT p.project_id 
      FROM public.projects p 
      ORDER BY p.project_id 
      LIMIT 1
    )
    WHERE a.project_id IS NULL AND a.lesson_id IS NULL;
  END IF;
END $$;

-- Populate module_access for existing users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_access' AND table_schema = 'public')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments' AND table_schema = 'public') THEN
    -- Create module_access entries for all enrollments that don't have one
    INSERT INTO public.module_access (user_id, module_id, granted_at, expires_at, is_active)
    SELECT e.user_id, e.module_id, e.enrolled_at, e.expires_at, e.status = 'active'
    FROM public.enrollments e
    WHERE e.module_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.module_access ma 
      WHERE ma.user_id = e.user_id AND ma.module_id = e.module_id
    );
  
    -- Create progress entries for all users and lessons they should have access to
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress' AND table_schema = 'public')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons' AND table_schema = 'public') THEN
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
    END IF;
  END IF;
END $$;

-- Create optimized views for content access
-- Drop existing views if they exist
DROP VIEW IF EXISTS public.module_content_view;
DROP VIEW IF EXISTS public.user_module_progress;
DROP VIEW IF EXISTS public.user_assigned_content;

-- Create a view to see all module content
CREATE VIEW public.module_content_view AS
SELECT 
  m.module_id,
  m.name AS module_name,
  w.week_id,
  w.title AS week_title,
  w.order_num AS week_order,
  p.project_id,
  p.title AS project_title,
  p.order_num AS project_order,
  l.lesson_id,
  l.title AS lesson_title,
  l.order_num AS lesson_order,
  q.quiz_id,
  q.title AS quiz_title,
  a.assignment_id,
  a.title AS assignment_title,
  r.resource_id,
  r.title AS resource_title
FROM 
  public.modules m
  LEFT JOIN public.weeks w ON m.module_id = w.module_id
  LEFT JOIN public.projects p ON w.week_id = p.week_id
  LEFT JOIN public.lessons l ON p.project_id = l.project_id
  LEFT JOIN public.quizzes q ON l.lesson_id = q.lesson_id
  LEFT JOIN public.assignments a ON (l.lesson_id = a.lesson_id OR p.project_id = a.project_id)
  LEFT JOIN public.resources r ON l.lesson_id = r.lesson_id
ORDER BY 
  m.module_id, w.order_num, p.order_num, l.order_num;

-- Create a view to see user progress in modules
CREATE VIEW public.user_module_progress AS
SELECT 
  u.user_id,
  u.username,
  m.module_id,
  m.name AS module_name,
  COUNT(DISTINCT l.lesson_id) AS total_lessons,
  COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN l.lesson_id END) AS completed_lessons,
  CASE 
    WHEN COUNT(DISTINCT l.lesson_id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN l.lesson_id END)::NUMERIC / 
         COUNT(DISTINCT l.lesson_id)::NUMERIC) * 100, 2)
  END AS completion_percentage
FROM 
  public.users u
  JOIN public.module_access ma ON u.user_id = ma.user_id
  JOIN public.modules m ON ma.module_id = m.module_id
  LEFT JOIN public.weeks w ON m.module_id = w.module_id
  LEFT JOIN public.projects p ON w.week_id = p.week_id
  LEFT JOIN public.lessons l ON p.project_id = l.project_id
  LEFT JOIN public.progress pr ON u.user_id = pr.user_id AND l.lesson_id = pr.lesson_id
WHERE 
  ma.is_active = TRUE
GROUP BY 
  u.user_id, u.username, m.module_id, m.name;

-- Create a view to easily see all content assigned to a user
CREATE VIEW public.user_assigned_content AS
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
  ma.is_active = TRUE
ORDER BY 
  u.user_id, m.module_id, w.order_num, p.order_num, l.order_num;