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

-- Create quizzes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quizzes (
  quiz_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(lesson_id),
  title VARCHAR NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  passing_score INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resources (
  resource_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(lesson_id),
  title VARCHAR NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type VARCHAR,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  attempt_id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES public.quizzes(quiz_id),
  user_id INTEGER NOT NULL REFERENCES public.users(user_id),
  score INTEGER,
  started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  status VARCHAR DEFAULT 'in_progress'
);

-- Create module_access table to track which modules a user has access to
CREATE TABLE IF NOT EXISTS public.module_access (
  access_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(user_id),
  module_id INTEGER NOT NULL REFERENCES public.modules(module_id),
  granted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, module_id)
);

-- Add module_id column to weeks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weeks' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE public.weeks ADD COLUMN module_id INTEGER REFERENCES public.modules(module_id);
  END IF;
END $$;

-- Add module_id column to enrollments table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE public.enrollments ADD COLUMN module_id INTEGER REFERENCES public.modules(module_id);
  END IF;
END $$;

-- Update existing enrollments to link to modules based on the module name
UPDATE public.enrollments e
SET module_id = m.module_id
FROM public.modules m
WHERE e.module = m.name
AND e.module_id IS NULL;

-- Create a trigger function to automatically create module_access entries when a user enrolls
CREATE OR REPLACE FUNCTION public.create_module_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Create module access entry if it doesn't exist
  INSERT INTO public.module_access (user_id, module_id, granted_at, expires_at, is_active)
  VALUES (NEW.user_id, NEW.module_id, NEW.enrolled_at, NEW.expires_at, NEW.status = 'active')
  ON CONFLICT (user_id, module_id) DO UPDATE
  SET expires_at = NEW.expires_at,
      is_active = (NEW.status = 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create module_access entries when a user enrolls
DROP TRIGGER IF EXISTS create_module_access_trigger ON public.enrollments;
CREATE TRIGGER create_module_access_trigger
AFTER INSERT OR UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.create_module_access();

-- Create a function to populate module content when a week is assigned to a module
CREATE OR REPLACE FUNCTION public.populate_module_content()
RETURNS TRIGGER AS $$
BEGIN
  -- When a week is assigned to a module, ensure all content is properly linked
  UPDATE public.projects p
  SET week_id = NEW.week_id
  WHERE p.week_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to populate module content when a week is assigned to a module
DROP TRIGGER IF EXISTS populate_module_content_trigger ON public.weeks;
CREATE TRIGGER populate_module_content_trigger
AFTER INSERT OR UPDATE OF module_id ON public.weeks
FOR EACH ROW
EXECUTE FUNCTION public.populate_module_content();

-- Create a view to easily see all content related to a module
DROP VIEW IF EXISTS public.module_content_view;
CREATE VIEW public.module_content_view AS
SELECT 
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
  r.title AS resource_title
FROM 
  public.modules m
  LEFT JOIN public.weeks w ON m.module_id = w.module_id
  LEFT JOIN public.projects p ON w.week_id = p.week_id
  LEFT JOIN public.lessons l ON p.project_id = l.project_id
  LEFT JOIN public.quizzes q ON l.lesson_id = q.lesson_id
  LEFT JOIN public.assignments a ON (l.lesson_id = a.lesson_id OR p.project_id = a.project_id)
  LEFT JOIN public.resources r ON l.lesson_id = r.lesson_id;

-- Create a view to see user module access and progress
DROP VIEW IF EXISTS public.user_module_progress;
CREATE VIEW public.user_module_progress AS
SELECT 
  u.user_id,
  u.username,
  m.module_id,
  m.name AS module_name,
  ma.granted_at,
  ma.expires_at,
  ma.is_active,
  COUNT(DISTINCT l.lesson_id) AS total_lessons,
  COUNT(DISTINCT CASE WHEN pr.completed THEN l.lesson_id END) AS completed_lessons,
  CASE 
    WHEN COUNT(DISTINCT l.lesson_id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT CASE WHEN pr.completed THEN l.lesson_id END)::numeric / COUNT(DISTINCT l.lesson_id)::numeric) * 100, 2)
  END AS completion_percentage
FROM 
  public.users u
  JOIN public.module_access ma ON u.user_id = ma.user_id
  JOIN public.modules m ON ma.module_id = m.module_id
  LEFT JOIN public.weeks w ON m.module_id = w.module_id
  LEFT JOIN public.projects p ON w.week_id = p.week_id
  LEFT JOIN public.lessons l ON p.project_id = l.project_id
  LEFT JOIN public.progress pr ON u.user_id = pr.user_id AND l.lesson_id = pr.lesson_id
GROUP BY 
  u.user_id, u.username, m.module_id, m.name, ma.granted_at, ma.expires_at, ma.is_active;