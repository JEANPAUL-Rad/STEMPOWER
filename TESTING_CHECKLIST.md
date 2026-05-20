# Week Inactive Feature - Testing & Verification Checklist

## Database Migration Verification

### Step 1: Run the Migration
```bash
# Ensure migration 020 is executed on your database
psql -U your_user -d your_database -f migrations/020_add_is_active_columns.sql
```

### Step 2: Verify Schema Changes
```sql
-- Check is_active columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name IN ('weeks', 'projects', 'lessons', 'assignments', 'resources')
AND column_name = 'is_active';

-- Expected: 5 rows, all showing BOOLEAN, DEFAULT true

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sync_week_content_status';

-- Expected: 1 row

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('weeks', 'projects', 'lessons', 'assignments', 'resources')
AND indexname LIKE '%is_active%';

-- Expected: 5 indexes
```

## Backend Code Verification

### Step 3: Verify Student Model Changes
```javascript
// File: src/models/student.model.js

// Should contain these changes:
// ✓ getWeeks() includes: WHERE w.is_active = true
// ✓ getProjectsByWeek() includes: AND p.is_active = true AND w.is_active = true
// ✓ getProjectDetails() includes: AND p.is_active = true AND w.is_active = true
// ✓ getAllProjects() includes: AND p.is_active = true AND w.is_active = true
// ✓ getLessonsByProject() includes: WHERE l.is_active = true
// ✓ getLessonDetails() includes: AND l.is_active = true
// ✓ getResources() includes: WHERE r.is_active = true AND w.is_active = true
// ✓ getProjectsByWeekDashboard() includes: WHERE w.is_active = true AND p.is_active = true
// ✓ Dashboard stat queries include is_active filtering
```

### Step 4: Verify Admin Model Changes
```javascript
// File: src/models/admin/week.model.js
// ✓ createWeek() includes: is_active = ${is_active || true}
// ✓ updateWeek() includes: is_active = COALESCE(${is_active}, is_active)

// File: src/models/admin/project.model.js
// ✓ createProject() includes: is_active = ${is_active || true}
// ✓ updateProject() includes: is_active = COALESCE(${is_active}, is_active)

// File: src/models/admin/lesson.model.js
// ✓ createLesson() includes: is_active = ${is_active || true}
// ✓ updateLesson() includes: is_active = COALESCE(${is_active}, is_active)

// File: src/models/admin/assignment.model.js
// ✓ createAssignment() includes: is_active = ${is_active || true}
// ✓ updateAssignment() supports: is_active = COALESCE(${is_active}, is_active)

// File: src/models/admin/resource.model.js
// ✓ createResource() includes: is_active = ${is_active || true}
// ✓ updateResource() includes: is_active = COALESCE(${is_active}, is_active)
```

## API Testing

### Step 5: Test Admin Endpoints

#### Test 5.1: Hide a Week
```bash
# Get a week ID first
curl -X GET http://localhost:3000/api/admin/weeks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Hide the week (replace 1 with actual week_id)
curl -X PUT http://localhost:3000/api/admin/weeks/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'

# Response should show: "is_active": false
```

#### Test 5.2: Show a Week Again
```bash
curl -X PUT http://localhost:3000/api/admin/weeks/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'

# Response should show: "is_active": true
```

#### Test 5.3: Hide Project
```bash
curl -X PUT http://localhost:3000/api/admin/projects/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

#### Test 5.4: Hide Lesson
```bash
curl -X PUT http://localhost:3000/api/admin/lessons/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

#### Test 5.5: Hide Assignment
```bash
curl -X PUT http://localhost:3000/api/admin/assignments/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

#### Test 5.6: Hide Resource
```bash
curl -X PUT http://localhost:3000/api/admin/resources/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

## Student View Verification

### Step 6: Test Student Dashboard Access

#### Test 6.1: Create Test Data
1. Login as Admin
2. Create a test week (e.g., "Test Week Hidden")
3. Add a project to that week
4. Add a lesson to that project
5. Add an assignment to that lesson
6. Add resources to the week

#### Test 6.2: Hide the Week
1. Set the test week to `is_active: false`
2. Verify in database:
```sql
SELECT week_id, is_active FROM weeks WHERE title = 'Test Week Hidden';
-- Should show: is_active = false

SELECT project_id, is_active FROM projects WHERE week_id = <week_id>;
-- Should show: all projects is_active = false (CASCADE WORKED!)

SELECT lesson_id, is_active FROM lessons 
WHERE project_id IN (SELECT project_id FROM projects WHERE week_id = <week_id>);
-- Should show: all lessons is_active = false (CASCADE WORKED!)
```

#### Test 6.3: Student Dashboard
1. Login as Student
2. Check dashboard
3. Verify:
   - ✓ Test week does NOT appear in weeks list
   - ✓ Test week's projects are NOT visible
   - ✓ Test week's lessons are NOT visible
   - ✓ Dashboard statistics don't count hidden content
   - ✓ Can't access hidden week via direct API call

#### Test 6.4: Show the Week Again
1. Set the test week back to `is_active: true`
2. Login as Student
3. Verify:
   - ✓ Test week reappears in weeks list
   - ✓ Projects are visible again
   - ✓ Lessons are visible again
   - ✓ Dashboard statistics updated
   - ✓ Can access content normally

### Step 7: Test Cascade Behavior

#### Test 7.1: Hide Week → Verify Cascade
```sql
-- Hide a week
UPDATE weeks SET is_active = false WHERE week_id = 5;

-- Check cascade results
SELECT 
  'Week' as object, is_active, COUNT(*) 
FROM weeks WHERE week_id = 5 
GROUP BY is_active

UNION ALL

SELECT 
  'Projects', is_active, COUNT(*) 
FROM projects WHERE week_id = 5 
GROUP BY is_active

UNION ALL

SELECT 
  'Lessons', is_active, COUNT(*) 
FROM lessons 
WHERE project_id IN (SELECT project_id FROM projects WHERE week_id = 5)
GROUP BY is_active

UNION ALL

SELECT 
  'Resources', is_active, COUNT(*) 
FROM resources WHERE week_id = 5 
GROUP BY is_active;

-- Expected: All should show false (cascade worked)
```

#### Test 7.2: Hide Project → Week Visible
1. Hide a project (not week)
2. Verify:
   - ✓ Week is still active/visible
   - ✓ Project is hidden
   - ✓ Lessons in project are hidden
   - ✓ Other projects in same week are still visible

### Step 8: Test Individual Hiding

#### Test 8.1: Hide Single Lesson
1. Keep week and project active
2. Hide one lesson
3. Verify:
   - ✓ Week visible
   - ✓ Project visible
   - ✓ Other lessons in project visible
   - ✓ Hidden lesson not visible
   - ✓ Assignments for hidden lesson not visible

#### Test 8.2: Hide Single Assignment
1. Keep week, project, lesson active
2. Hide one assignment
3. Verify:
   - ✓ Week visible
   - ✓ Project visible
   - ✓ Lesson visible
   - ✓ Other assignments visible
   - ✓ Hidden assignment not visible

#### Test 8.3: Hide Single Resource
1. Hide one resource
2. Verify:
   - ✓ Week visible
   - ✓ Resource not visible
   - ✓ Other resources visible

### Step 9: Test Dashboard Statistics

#### Test 9.1: Stats with Mixed Active/Inactive
1. Create scenario with:
   - 2 active weeks, 1 inactive week
   - Active week has 3 projects, inactive week has 2 projects
   - Each project has varying lessons

2. Check dashboard stats:
```bash
curl -X GET http://localhost:3000/api/student/dashboard/stats \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

Expected: 
- Total weeks: 2 (not 3)
- Total projects: 3 (not 5)
- Count should exclude inactive content

### Step 10: Performance Testing

#### Test 10.1: Query Performance
```sql
-- Check indexes are used
EXPLAIN ANALYZE
SELECT w.week_id, w.title FROM weeks w
WHERE w.is_active = true;

-- Should show: Index Scan on weeks_is_active_idx

-- Check composite queries
EXPLAIN ANALYZE
SELECT p.project_id, p.title 
FROM projects p
JOIN weeks w ON p.week_id = w.week_id
WHERE w.is_active = true AND p.is_active = true;

-- Should show: Index usage
```

#### Test 10.2: Large Dataset
1. Create 1000+ weeks with projects/lessons
2. Hide 200 weeks
3. Query dashboard - should still be fast
4. Verify no N+1 queries or performance issues

## Rollback Testing

### Step 11: Test Rollback Procedure

#### Test 11.1: Full Rollback
```sql
-- Backup current state
CREATE TABLE backup_weeks AS SELECT * FROM weeks;
CREATE TABLE backup_projects AS SELECT * FROM projects;
-- ... backup other tables

-- Execute rollback
UPDATE weeks SET is_active = true;
UPDATE projects SET is_active = true;
UPDATE lessons SET is_active = true;
UPDATE assignments SET is_active = true;
UPDATE resources SET is_active = true;

DROP TRIGGER trigger_sync_week_content_status ON weeks;
DROP FUNCTION sync_week_content_status();

-- Drop columns (if needed)
-- ALTER TABLE weeks DROP COLUMN is_active;
-- ... etc

-- Verify system still works
SELECT * FROM weeks LIMIT 5;
```

## Final Verification Checklist

- [ ] Migration runs without errors
- [ ] All schema columns created with correct defaults
- [ ] Trigger function installed successfully
- [ ] Indexes created for performance
- [ ] Student queries filter by is_active=true
- [ ] Admin can toggle is_active via API
- [ ] Cascading works (hiding week hides all content)
- [ ] Individual hiding works (can hide project without hiding week)
- [ ] Students can't see inactive content
- [ ] Dashboard statistics exclude inactive content
- [ ] Re-enabling works (content appears again)
- [ ] Performance is acceptable with indexes
- [ ] Rollback procedure works if needed

## Issues Found & Resolution

If any test fails, use this troubleshooting guide:

### Issue: Students still see hidden content
**Solution:**
1. Verify migration ran: `SELECT column_name FROM information_schema.columns WHERE table_name='weeks' AND column_name='is_active';`
2. Verify student queries have `WHERE is_active = true` filter
3. Check database connection using correct database name

### Issue: Cascade not working
**Solution:**
1. Verify trigger exists: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%sync%';`
2. Check trigger is enabled: `SELECT is_enabled FROM information_schema.triggers WHERE trigger_name = 'trigger_sync_week_content_status';`
3. Manually test trigger: Update a week and check if projects/lessons updated

### Issue: Performance degradation
**Solution:**
1. Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename IN ('weeks','projects','lessons','assignments','resources');`
2. Run ANALYZE on tables: `ANALYZE weeks, projects, lessons, assignments, resources;`
3. Check query plans with EXPLAIN ANALYZE

---

**Run these tests before deploying to production!**
