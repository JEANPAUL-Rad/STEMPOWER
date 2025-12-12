-- Migration: Fix assignment_submissions table schema
-- Add missing columns if they don't exist

-- Add answer_file_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignment_submissions' 
        AND column_name = 'answer_file_url'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD COLUMN answer_file_url text;
        
        -- Update existing rows if any
        UPDATE assignment_submissions 
        SET answer_file_url = '' 
        WHERE answer_file_url IS NULL;
        
        -- Make it NOT NULL after setting defaults
        ALTER TABLE assignment_submissions 
        ALTER COLUMN answer_file_url SET NOT NULL;
        
        RAISE NOTICE 'Added answer_file_url column to assignment_submissions';
    ELSE
        RAISE NOTICE 'answer_file_url column already exists';
    END IF;
END $$;

-- Add answer_file_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignment_submissions' 
        AND column_name = 'answer_file_name'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD COLUMN answer_file_name character varying;
        RAISE NOTICE 'Added answer_file_name column to assignment_submissions';
    ELSE
        RAISE NOTICE 'answer_file_name column already exists';
    END IF;
END $$;

-- Add file_size_bytes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignment_submissions' 
        AND column_name = 'file_size_bytes'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD COLUMN file_size_bytes bigint;
        RAISE NOTICE 'Added file_size_bytes column to assignment_submissions';
    ELSE
        RAISE NOTICE 'file_size_bytes column already exists';
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignment_submissions' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD COLUMN status character varying DEFAULT 'submitted';
        RAISE NOTICE 'Added status column to assignment_submissions';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
END $$;

-- Add submitted_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignment_submissions' 
        AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD COLUMN submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added submitted_at column to assignment_submissions';
    ELSE
        RAISE NOTICE 'submitted_at column already exists';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assignment_submissions'
ORDER BY ordinal_position;






