-- Migration: Create all file storage tables
-- This migration creates tables for storing files separately from their parent entities

-- Assignment files
CREATE TABLE IF NOT EXISTS public.assignment_files (
  file_id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES public.assignments(assignment_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES public.users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignment_files_assignment_id ON public.assignment_files(assignment_id);

-- Assignment submission files
CREATE TABLE IF NOT EXISTS public.assignment_submission_files (
  file_id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES public.assignment_submissions(submission_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES public.users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignment_submission_files_submission_id ON public.assignment_submission_files(submission_id);

-- Lesson files
CREATE TABLE IF NOT EXISTS public.lesson_files (
  file_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES public.users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson_id ON public.lesson_files(lesson_id);

-- Quiz question files
CREATE TABLE IF NOT EXISTS public.quiz_question_files (
  file_id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES public.quiz_questions(question_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  uploaded_by INTEGER REFERENCES public.users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_question_files_question_id ON public.quiz_question_files(question_id);

-- Resource files
CREATE TABLE IF NOT EXISTS public.resource_files (
  file_id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES public.resources(resource_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES public.users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_files_resource_id ON public.resource_files(resource_id);

-- Submission answer files (for quiz submissions)
CREATE TABLE IF NOT EXISTS public.submission_answer_files (
  file_id SERIAL PRIMARY KEY,
  answer_id INTEGER NOT NULL REFERENCES public.submission_answers(answer_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES public.users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_answer_files_answer_id ON public.submission_answer_files(answer_id);

-- Protoforial files
CREATE TABLE IF NOT EXISTS public.protoforial_files (
  file_id SERIAL PRIMARY KEY,
  proto_id INTEGER NOT NULL REFERENCES public.protoforial(proto_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_protoforial_files_proto_id ON public.protoforial_files(proto_id);

-- Verify tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'assignment_files',
    'assignment_submission_files',
    'lesson_files',
    'quiz_question_files',
    'resource_files',
    'submission_answer_files',
    'protoforial_files'
  )
ORDER BY table_name;






