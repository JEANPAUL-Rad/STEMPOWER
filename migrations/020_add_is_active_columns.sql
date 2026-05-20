-- Migration: Add is_active status to weeks and related content
-- This allows marking weeks (and all associated content) as inactive

-- 1. Add is_active column to weeks table
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add is_active column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add is_active column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Add is_active column to resources table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Add is_active column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5b. Add is_active column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 6. Create or replace the sync_week_content_status trigger function
-- This function synchronizes the status of all content when a week's status changes
CREATE OR REPLACE FUNCTION sync_week_content_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Projects in this week (Has week_id)
    UPDATE projects
    SET is_active = NEW.is_active
    WHERE week_id = NEW.week_id;

    -- 2. Lessons in this week (Has week_id or via project)
    UPDATE lessons
    SET is_active = NEW.is_active
    WHERE week_id = NEW.week_id 
       OR project_id IN (SELECT project_id FROM projects WHERE week_id = NEW.week_id);

    -- 3. Resources in this week (Has week_id)
    UPDATE resources
    SET is_active = NEW.is_active
    WHERE week_id = NEW.week_id;

    -- 4. Assignments (REMOVED from sync - managed independently)
    -- UPDATE assignments SET is_active = NEW.is_active WHERE ...

    -- 5. Quizzes in this week (NO week_id, must use lesson_id or project_id)
    UPDATE quizzes
    SET is_active = NEW.is_active
    WHERE lesson_id IN (
        SELECT lesson_id FROM lessons 
        WHERE week_id = NEW.week_id 
           OR project_id IN (SELECT project_id FROM projects WHERE week_id = NEW.week_id)
    ) OR project_id IN (
        SELECT project_id FROM projects WHERE week_id = NEW.week_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to execute the sync function when week.is_active changes
DROP TRIGGER IF EXISTS trigger_sync_week_content_status ON weeks;
CREATE TRIGGER trigger_sync_week_content_status
AFTER UPDATE OF is_active ON weeks
FOR EACH ROW
WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
EXECUTE FUNCTION sync_week_content_status();

-- 7b. Create trigger function for project status synchronization
CREATE OR REPLACE FUNCTION sync_project_content_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Lessons in this project
    UPDATE lessons
    SET is_active = NEW.is_active
    WHERE project_id = NEW.project_id;

    -- 2. Assignments (REMOVED from sync - managed independently)
    -- UPDATE assignments SET is_active = NEW.is_active WHERE ...

    -- 3. Quizzes in this project
    UPDATE quizzes
    SET is_active = NEW.is_active
    WHERE project_id = NEW.project_id
       OR lesson_id IN (SELECT lesson_id FROM lessons WHERE project_id = NEW.project_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7c. Create trigger for projects
DROP TRIGGER IF EXISTS trigger_sync_project_content_status ON projects;
CREATE TRIGGER trigger_sync_project_content_status
AFTER UPDATE OF is_active ON projects
FOR EACH ROW
WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
EXECUTE FUNCTION sync_project_content_status();

-- 8. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weeks_is_active ON weeks(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_is_active ON assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_resources_is_active ON resources(is_active);
CREATE INDEX IF NOT EXISTS idx_lessons_is_active ON lessons(is_active);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_active ON quizzes(is_active);
