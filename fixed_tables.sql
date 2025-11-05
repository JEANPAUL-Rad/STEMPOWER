-- First, create tables with no foreign key dependencies
CREATE TABLE public.contact_messages (
  id integer NOT NULL DEFAULT nextval('contact_messages_id_seq'::regclass),
  name character varying NOT NULL,
  email character varying NOT NULL,
  service character varying NOT NULL,
  message text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.live_sessions (
  live_id integer NOT NULL DEFAULT nextval('live_sessions_live_id_seq'::regclass),
  title character varying NOT NULL,
  description text,
  meet_link text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT live_sessions_pkey PRIMARY KEY (live_id)
);

-- Create users table
CREATE TABLE public.users (
  user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
  username character varying NOT NULL,
  email character varying NOT NULL,
  password_hash character varying NOT NULL,
  role character varying DEFAULT 'student'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_username_key UNIQUE (username)
);

-- Create register table
CREATE TABLE public.register (
  id integer NOT NULL DEFAULT nextval('register_id_seq'::regclass),
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying NOT NULL,
  module character varying NOT NULL,
  payment_status character varying DEFAULT 'pending'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT register_pkey PRIMARY KEY (id),
  CONSTRAINT register_email_key UNIQUE (email)
);

-- Create modules table
CREATE TABLE public.modules (
  module_id integer NOT NULL DEFAULT nextval('modules_module_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  duration_weeks integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  CONSTRAINT modules_pkey PRIMARY KEY (module_id),
  CONSTRAINT modules_name_key UNIQUE (name)
);

-- Create weeks table
CREATE TABLE public.weeks (
  week_id integer NOT NULL DEFAULT nextval('weeks_week_id_seq'::regclass),
  module_id integer NOT NULL,
  title character varying NOT NULL,
  description text,
  order_num integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT weeks_pkey PRIMARY KEY (week_id),
  CONSTRAINT weeks_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id)
);

-- Create projects table
CREATE TABLE public.projects (
  project_id integer NOT NULL DEFAULT nextval('projects_project_id_seq'::regclass),
  week_id integer NOT NULL,
  title character varying NOT NULL,
  description text,
  order_num integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT projects_pkey PRIMARY KEY (project_id),
  CONSTRAINT projects_week_id_fkey FOREIGN KEY (week_id) REFERENCES public.weeks(week_id)
);

-- Create lessons table
CREATE TABLE public.lessons (
  lesson_id integer NOT NULL DEFAULT nextval('lessons_lesson_id_seq'::regclass),
  project_id integer NOT NULL,
  parent_lesson_id integer,
  title character varying NOT NULL,
  content text,
  order_num integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  file_url text,
  upload_image character varying,
  video_url character varying,
  CONSTRAINT lessons_pkey PRIMARY KEY (lesson_id),
  CONSTRAINT lessons_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id)
);

-- Add self-reference to lessons table after it's created
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_parent_lesson_id_fkey FOREIGN KEY (parent_lesson_id) REFERENCES public.lessons(lesson_id);

-- Create quizzes table
CREATE TABLE public.quizzes (
  quiz_id integer NOT NULL DEFAULT nextval('quizzes_quiz_id_seq'::regclass),
  lesson_id integer NOT NULL,
  title character varying NOT NULL,
  description text,
  time_limit_minutes integer,
  passing_score integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  CONSTRAINT quizzes_pkey PRIMARY KEY (quiz_id),
  CONSTRAINT quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id)
);

-- Create resources table
CREATE TABLE public.resources (
  resource_id integer NOT NULL DEFAULT nextval('resources_resource_id_seq'::regclass),
  lesson_id integer NOT NULL,
  title character varying NOT NULL,
  description text,
  file_url text,
  file_type character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT resources_pkey PRIMARY KEY (resource_id),
  CONSTRAINT resources_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  assignment_id integer NOT NULL DEFAULT nextval('assignments_assignment_id_seq'::regclass),
  project_id integer NOT NULL,
  lesson_id integer,
  title character varying NOT NULL,
  description text,
  question_file_url text NOT NULL,
  question_file_name character varying,
  max_file_size_mb integer DEFAULT 10,
  allowed_file_types text DEFAULT 'pdf,doc,docx,txt'::text,
  due_date timestamp without time zone,
  created_by integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  CONSTRAINT assignments_pkey PRIMARY KEY (assignment_id),
  CONSTRAINT assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id),
  CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- Create enrollments table with proper module reference
CREATE TABLE public.enrollments (
  enrollment_id integer NOT NULL DEFAULT nextval('enrollments_enrollment_id_seq'::regclass),
  user_id integer NOT NULL,
  registration_id integer,
  module_id integer NOT NULL,
  module character varying NOT NULL,
  enrolled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'expired'::character varying]::text[])),
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT enrollments_pkey PRIMARY KEY (enrollment_id),
  CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT enrollments_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.register(id),
  CONSTRAINT enrollments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id)
);

-- Create progress table
CREATE TABLE public.progress (
  progress_id integer NOT NULL DEFAULT nextval('progress_progress_id_seq'::regclass),
  user_id integer NOT NULL,
  lesson_id integer NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamp without time zone,
  CONSTRAINT progress_pkey PRIMARY KEY (progress_id),
  CONSTRAINT progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id)
);

-- Create assignment_downloads table
CREATE TABLE public.assignment_downloads (
  download_id integer NOT NULL DEFAULT nextval('assignment_downloads_download_id_seq'::regclass),
  assignment_id integer NOT NULL,
  user_id integer NOT NULL,
  downloaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ip_address inet,
  CONSTRAINT assignment_downloads_pkey PRIMARY KEY (download_id),
  CONSTRAINT assignment_downloads_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id),
  CONSTRAINT assignment_downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  submission_id integer NOT NULL DEFAULT nextval('assignment_submissions_submission_id_seq'::regclass),
  assignment_id integer NOT NULL,
  user_id integer NOT NULL,
  answer_file_url text NOT NULL,
  answer_file_name character varying,
  file_size_bytes bigint,
  submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  grade numeric,
  feedback text,
  graded_by integer,
  graded_at timestamp without time zone,
  status character varying DEFAULT 'submitted'::character varying CHECK (status::text = ANY (ARRAY['submitted'::character varying::text, 'graded'::character varying::text, 'returned'::character varying::text])),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (submission_id),
  CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id),
  CONSTRAINT assignment_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT assignment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(user_id)
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  attempt_id integer NOT NULL DEFAULT nextval('quiz_attempts_attempt_id_seq'::regclass),
  quiz_id integer NOT NULL,
  user_id integer NOT NULL,
  score integer,
  started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp without time zone,
  status character varying DEFAULT 'in_progress'::character varying,
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (attempt_id),
  CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(quiz_id),
  CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Create module_access table to track which modules a user has access to
CREATE TABLE public.module_access (
  access_id integer NOT NULL DEFAULT nextval('module_access_access_id_seq'::regclass),
  user_id integer NOT NULL,
  module_id integer NOT NULL,
  granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp without time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT module_access_pkey PRIMARY KEY (access_id),
  CONSTRAINT module_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT module_access_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id),
  CONSTRAINT module_access_user_module_unique UNIQUE (user_id, module_id)
);