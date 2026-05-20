# Quick Reference - Week Status Management

## Problem Solved ✅
Now you can mark weeks as inactive, and ALL associated content (lessons, projects, resources, assignments) automatically become hidden from the student dashboard.

## How It Works

### Simple Version
1. Admin: "Mark week as inactive" → Week is hidden from students
2. All content in that week: Hidden from students automatically
3. Admin: "Mark week as active" → Everything appears again

### Technical Version
- `is_active` column added to: weeks, projects, lessons, assignments, resources
- When week status changes → Trigger automatically updates all child content
- Student queries filter: `WHERE is_active = true`
- Dashboard stats exclude inactive content

## API Examples

### Hide a Week from Students
```bash
curl -X PUT http://localhost:3000/api/admin/weeks/1 \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```
**Result:** Week 1 and ALL its content disappear from student dashboard

### Show the Week Again
```bash
curl -X PUT http://localhost:3000/api/admin/weeks/1 \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```
**Result:** Week 1 and all its content reappear

### Hide Individual Project
```bash
curl -X PUT http://localhost:3000/api/admin/projects/5 \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### Hide Individual Lesson
```bash
curl -X PUT http://localhost:3000/api/admin/lessons/10 \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### Hide Individual Assignment
```bash
curl -X PUT http://localhost:3000/api/admin/assignments/15 \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### Hide Individual Resource
```bash
curl -X PUT http://localhost:3000/api/admin/resources/20 \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

## Frontend Setup

### In Admin Panel - Add Toggle Button
```javascript
<label>
  <input 
    type="checkbox" 
    checked={week.is_active}
    onChange={(e) => toggleWeekStatus(week.week_id, e.target.checked)}
  />
  Active
</label>
```

## What Students See

### When Content is Active (is_active = true)
✅ Week appears in dashboard
✅ Projects in week are visible
✅ Lessons in projects are visible
✅ Assignments are visible
✅ Resources are visible
✅ Content counts in statistics

### When Content is Inactive (is_active = false)
❌ Week hidden from dashboard
❌ Projects not visible
❌ Lessons not visible
❌ Assignments not visible
❌ Resources not visible
❌ Excluded from statistics

## Database Migration

**File to Run:**
```
migrations/020_add_is_active_columns.sql
```

This migration:
1. Adds `is_active` columns to all relevant tables
2. Creates trigger function for automatic sync
3. Creates performance indexes
4. Sets all existing content to active (default)

## Files Modified/Created

### New Files:
- `migrations/020_add_is_active_columns.sql` - Database changes
- `WEEK_INACTIVE_FEATURE.md` - Complete documentation

### Updated Models (Admin):
- `src/models/admin/week.model.js` - Can now create/update is_active
- `src/models/admin/project.model.js` - Can now create/update is_active
- `src/models/admin/lesson.model.js` - Can now create/update is_active
- `src/models/admin/assignment.model.js` - Can now create/update is_active
- `src/models/admin/resource.model.js` - Can now create/update is_active

### Updated Models (Student):
- `src/models/student.model.js` - All queries now filter by is_active=true

## Implementation Steps

1. **Run Migration**
   - Execute `migrations/020_add_is_active_columns.sql` on your database

2. **Test API**
   - Try hiding a week with: `PUT /api/admin/weeks/:id` with `{"is_active": false}`
   - Verify students can't see it in their dashboard

3. **Update Frontend Admin Panel**
   - Add toggle button for is_active on week/project/lesson/assignment/resource forms
   - Call API endpoint with the new status

4. **Deploy and Test**
   - Test with sample data
   - Verify cascade (hiding week hides everything)
   - Verify re-enabling (showing week shows everything)

## Troubleshooting

### Students Still See Hidden Content
- Ensure migration was run successfully
- Check student queries are using correct database
- Verify is_active column exists in tables

### Content Doesn't Cascade
- Trigger function may not be installed
- Check that trigger `trigger_sync_week_content_status` exists on weeks table

### Performance Issues
- Verify indexes were created on is_active columns
- Check database indexes:
  ```sql
  SELECT * FROM pg_indexes WHERE tablename IN ('weeks', 'projects', 'lessons', 'assignments', 'resources');
  ```

## Support

For complete documentation, see: `WEEK_INACTIVE_FEATURE.md`
