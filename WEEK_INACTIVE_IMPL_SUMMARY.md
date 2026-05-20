# Week Inactive Feature - Implementation Summary

## What Was Implemented

### ✅ Complete Feature: Toggle Week/Content Visibility
Students will NOT see weeks, projects, lessons, assignments, or resources marked as inactive in their dashboard.

## Files Created

### 1. Migration File
**File:** `migrations/020_add_is_active_columns.sql`
- Adds `is_active` BOOLEAN columns (default=true) to 5 tables
- Creates trigger function `sync_week_content_status()` 
- Automatically cascades status changes from week to all child content
- Creates performance indexes on all `is_active` columns

**Tables Modified:**
- `weeks.is_active`
- `projects.is_active`
- `lessons.is_active`
- `assignments.is_active`
- `resources.is_active`

### 2. Documentation Files
- **`WEEK_INACTIVE_FEATURE.md`** - Complete implementation guide with examples
- **`WEEK_INACTIVE_QUICK_START.md`** - Quick reference for admins

## Files Modified

### Backend Models (Admin)

#### 1. `src/models/admin/week.model.js`
**Changes:**
- `createWeek()` - Now accepts `is_active` parameter (default=true)
- `updateWeek()` - Now handles `is_active` field

**Example:**
```javascript
// Create week (active by default)
await createWeek({
  title: "Week 1",
  module: "Electrical Design",
  is_active: true
});

// Update week to inactive
await updateWeek(1, { is_active: false });
```

#### 2. `src/models/admin/project.model.js`
**Changes:**
- `createProject()` - Now accepts `is_active` parameter (default=true)
- `updateProject()` - Now handles `is_active` field

#### 3. `src/models/admin/lesson.model.js`
**Changes:**
- `createLesson()` - Now accepts `is_active` parameter (default=true)
- `updateLesson()` - Now handles `is_active` field

#### 4. `src/models/admin/assignment.model.js`
**Changes:**
- `createAssignment()` - Now accepts `is_active` parameter (default=true)
- `updateAssignment()` - Already handled `is_active` (enhanced)

#### 5. `src/models/admin/resource.model.js`
**Changes:**
- `createResource()` - Now accepts `is_active` parameter (default=true)
- `updateResource()` - Now handles `is_active` field

### Backend Models (Student - CRITICAL CHANGES)

#### `src/models/student.model.js`
**Changes:** All student-facing queries updated to filter by `is_active = true`

**Updated Functions:**

1. **`getWeeks(user_id)`**
   - Added: `WHERE w.is_active = true`
   - Effect: Students only see active weeks

2. **`getProjectsByWeek(week_id, user_id)`**
   - Added: `AND p.is_active = true` for projects
   - Added: `AND w.is_active = true` for weeks
   - Effect: Students only see projects in active weeks

3. **`getProjectDetails(project_id, user_id)`**
   - Added: `AND p.is_active = true`
   - Added: `AND w.is_active = true` for parent week
   - Effect: Can't access hidden projects

4. **`getAllProjects(user_id)`**
   - Added: `AND p.is_active = true`
   - Added: `AND w.is_active = true`
   - Effect: Dashboard shows only active projects

5. **`getLessonsByProject(project_id, user_id)`**
   - Added: `WHERE l.is_active = true`
   - Effect: Only active lessons visible

6. **`getLessonDetails(lesson_id)`**
   - Added: `WHERE l.lesson_id = ${lesson_id} AND l.is_active = true`
   - Effect: Can't view inactive lessons

7. **`getResources(type, user_id)`**
   - Added: `WHERE r.is_active = true`
   - Added: `AND w.is_active = true` for linked weeks
   - Effect: Only active resources shown

8. **Dashboard Queries - `getProjectsByWeekDashboard(user_id)`**
   - Updated queries for MEP and non-MEP users
   - Added: `WHERE w.is_active = true`
   - Added: `AND p.is_active = true`
   - Added: `WHERE l.is_active = true` for lessons in subqueries
   - Effect: Dashboard only shows active content

9. **Statistics Queries - Multiple dashboard stat functions**
   - Updated: Overall stats query to count only active content
   - Updated: Completed lessons query with `is_active = true`
   - Updated: Quiz stats query with `is_active = true`
   - Effect: Dashboard statistics exclude inactive content

## How the Cascade Works

### Automatic Cascade (Trigger)
When you set `weeks.is_active = false`:

```sql
-- Database trigger automatically executes:

UPDATE projects SET is_active = false 
WHERE week_id = <week_id>;

UPDATE lessons SET is_active = false 
WHERE project_id IN (
  SELECT project_id FROM projects WHERE week_id = <week_id>
);

UPDATE resources SET is_active = false 
WHERE week_id = <week_id>;

UPDATE assignments SET is_active = false 
WHERE lesson_id IN (
  SELECT lesson_id FROM lessons 
  WHERE project_id IN (
    SELECT project_id FROM projects WHERE week_id = <week_id>
  )
);
```

## API Usage

### Toggle Week Status
```bash
PUT /api/admin/weeks/:week_id
Content-Type: application/json

{
  "is_active": false
}
```

### Toggle Project Status
```bash
PUT /api/admin/projects/:project_id
Content-Type: application/json

{
  "is_active": false
}
```

### Toggle Lesson Status
```bash
PUT /api/admin/lessons/:lesson_id
Content-Type: application/json

{
  "is_active": false
}
```

### Toggle Assignment Status
```bash
PUT /api/admin/assignments/:assignment_id
Content-Type: application/json

{
  "is_active": false
}
```

### Toggle Resource Status
```bash
PUT /api/admin/resources/:resource_id
Content-Type: application/json

{
  "is_active": false
}
```

## Immediate Impact When Deployed

### For Students
1. ✅ Inactive weeks won't appear in week list
2. ✅ Inactive projects won't appear in project list
3. ✅ Inactive lessons won't appear in lesson list
4. ✅ Inactive assignments won't appear in their dashboard
5. ✅ Inactive resources won't appear in resource library
6. ✅ Dashboard statistics updated to exclude inactive content

### For Admins
1. ✅ Can toggle `is_active` via API for any content
2. ✅ Can control individual visibility or use cascade
3. ✅ Changes take effect immediately

### For Database
1. ✅ New indexes on all `is_active` columns for performance
2. ✅ Trigger function ensures data consistency
3. ✅ All existing content defaults to active (no changes needed)

## Deployment Checklist

- [ ] Run migration `020_add_is_active_columns.sql`
- [ ] Verify columns exist on all tables
- [ ] Verify trigger function is installed
- [ ] Verify indexes are created
- [ ] Test API endpoint to hide a week
- [ ] Test that students can't see hidden week
- [ ] Update frontend admin panel with toggle UI
- [ ] Test cascade (hide week → everything hidden)
- [ ] Test re-enable (show week → everything shown)

## Performance Optimizations

- Indexes created on `is_active` columns prevent slow queries
- Trigger function only runs when status actually changes
- All queries use indexed conditions for filtering
- No performance degradation for students

## Rollback Plan (if needed)

To rollback this feature:
```sql
-- 1. Make everything active again
UPDATE weeks SET is_active = true;
UPDATE projects SET is_active = true;
UPDATE lessons SET is_active = true;
UPDATE assignments SET is_active = true;
UPDATE resources SET is_active = true;

-- 2. Drop trigger
DROP TRIGGER trigger_sync_week_content_status ON weeks;

-- 3. Drop function
DROP FUNCTION sync_week_content_status();

-- 4. Drop columns (optional, can leave them)
ALTER TABLE weeks DROP COLUMN is_active;
-- ... repeat for other tables
```

## Testing Recommendations

### Test 1: Hide Week
1. Create test week with projects/lessons
2. Set `is_active = false` for week
3. Login as student
4. Verify week doesn't appear in dashboard
5. Verify all stats exclude this content

### Test 2: Cascade Effect
1. Hide one week
2. Verify ALL its projects are hidden
3. Verify ALL lessons in those projects are hidden
4. Verify ALL assignments for those lessons are hidden
5. Verify ALL resources linked are hidden

### Test 3: Re-enable
1. Re-enable the hidden week
2. Verify everything reappears
3. Verify stats update

### Test 4: Individual Hiding
1. Hide individual project (not week)
2. Verify week still visible but project is not
3. Verify lessons in that project not visible

## Success Criteria

✅ Students see only active weeks on dashboard
✅ Students can't access hidden content through any API
✅ Dashboard stats exclude inactive content
✅ Toggling week status cascades to all child content
✅ Individual content can be hidden independently
✅ Changes take effect immediately
✅ No performance degradation
✅ All existing content still active (default)

---

## Questions or Issues?

See `WEEK_INACTIVE_FEATURE.md` for complete documentation
See `WEEK_INACTIVE_QUICK_START.md` for quick reference
