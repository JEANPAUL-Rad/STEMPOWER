# Week Inactive Status - Implementation Guide

## Overview
This feature allows administrators to mark weeks (and all associated content) as **inactive**, which will automatically hide them from the student dashboard. When a week is marked as **active**, all its content becomes visible again.

## Database Changes

### New Columns Added
The following `is_active` columns (Boolean, default=true) have been added to manage content visibility:
- `weeks.is_active` - Controls visibility of entire week and all its content
- `projects.is_active` - Controls individual project visibility
- `lessons.is_active` - Controls individual lesson visibility  
- `assignments.is_active` - Controls individual assignment visibility
- `resources.is_active` - Controls individual resource visibility

### Automatic Sync
A trigger function `sync_week_content_status()` automatically updates child content when a week's status changes:
- When week is marked inactive: all projects, lessons, assignments, and resources in that week become inactive
- When week is marked active: all content in that week becomes active

## Migration
Run the migration file to apply these changes:
```sql
-- File: migrations/020_add_is_active_columns.sql
-- This creates the columns, trigger function, and indexes
```

## API Usage

### Update Week Status (Toggle Active/Inactive)

**Endpoint:** `PUT /api/admin/weeks/:week_id`

**Request Body:**
```json
{
  "title": "Week 1",
  "description": "Introduction",
  "module": "Electrical Design",
  "is_active": false
}
```

When you set `is_active: false` for a week:
- The week will be hidden from the student dashboard
- All projects in that week will be hidden
- All lessons in those projects will be hidden
- All assignments linked to those lessons will be hidden
- All resources linked to that week will be hidden

**Example Request:**
```bash
curl -X PUT http://localhost:3000/api/admin/weeks/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### Update Individual Project Status

**Endpoint:** `PUT /api/admin/projects/:project_id`

**Request Body:**
```json
{
  "title": "Project 1",
  "is_active": false
}
```

### Update Individual Lesson Status

**Endpoint:** `PUT /api/admin/lessons/:lesson_id`

**Request Body:**
```json
{
  "title": "Lesson 1",
  "is_active": false
}
```

### Update Individual Assignment Status

**Endpoint:** `PUT /api/admin/assignments/:assignment_id`

**Request Body:**
```json
{
  "title": "Assignment 1",
  "is_active": false
}
```

### Update Individual Resource Status

**Endpoint:** `PUT /api/admin/resources/:resource_id`

**Request Body:**
```json
{
  "title": "Resource 1",
  "type": "video",
  "is_active": false
}
```

## Student-Facing Behavior

### When Content is Inactive (is_active = false)
Students will **NOT** see:
- The inactive week in the weeks list
- Any projects within the inactive week
- Any lessons within projects of the inactive week
- Any assignments linked to lessons in inactive projects
- Any resources linked to the inactive week
- Dashboard counts will exclude inactive content
- Dashboard statistics (total weeks, projects, lessons) will only count active content

### When Content is Active (is_active = true)
Students will see:
- The week in their weeks list
- All projects and lessons within that week
- All assignments for lessons in that week
- All resources linked to that week
- Dashboard will include this content in statistics

## Frontend Integration

### Display is_active Status in Admin Panel
Add a toggle or checkbox in the admin interface to manage is_active status:

```javascript
// Example React component
function WeekToggle({ week, onToggle }) {
  return (
    <label>
      <input 
        type="checkbox" 
        checked={week.is_active}
        onChange={(e) => onToggle(week.week_id, e.target.checked)}
      />
      Active
    </label>
  );
}
```

### Update Calls
When updating a week/project/lesson/assignment/resource:

```javascript
// Toggle week status
const toggleWeekStatus = async (weekId, isActive) => {
  const response = await fetch(`/api/admin/weeks/${weekId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      is_active: isActive
    })
  });
  return response.json();
};
```

## Example Scenarios

### Scenario 1: Hide Week from Students Temporarily
1. Admin goes to week management
2. Toggles `is_active: false` for "Week 3"
3. Database trigger automatically deactivates all projects, lessons, assignments, resources in that week
4. Students immediately see Week 3 disappear from their dashboard
5. All content stats are updated automatically

### Scenario 2: Prevent Students from Seeing Specific Lesson
1. Admin goes to lesson management
2. Toggles `is_active: false` for specific lesson
3. Students don't see that lesson in their project view
4. If it's the only lesson in a project, project might show 0 lessons

### Scenario 3: Re-enable Content
1. Admin toggles `is_active: true` for previously inactive week
2. All content in that week becomes active again
3. Students see it reappear in their dashboard instantly

## Database Queries Updated

All student-facing queries have been updated to filter by `is_active = true`:
- `getWeeks()` - Returns only active weeks
- `getProjectsByWeek()` - Returns only active projects
- `getProjectDetails()` - Checks project is active
- `getAllProjects()` - Returns only active projects
- `getLessonsByProject()` - Returns only active lessons
- `getLessonDetails()` - Checks lesson is active
- `getResources()` - Returns only active resources
- Dashboard statistics - Count only active content

## Indexes Created
For performance optimization, indexes have been created on:
- `weeks.is_active`
- `projects.is_active`
- `lessons.is_active`
- `assignments.is_active`
- `resources.is_active`

## Rollback (if needed)
If you need to rollback this feature, you can:
1. Set all `is_active = true` for affected tables
2. Drop the trigger: `DROP TRIGGER trigger_sync_week_content_status ON weeks;`
3. Drop the function: `DROP FUNCTION sync_week_content_status();`
4. Remove the columns: `ALTER TABLE weeks DROP COLUMN is_active;` etc.

## Notes
- Default value for all `is_active` columns is `true` (content is active by default)
- When creating new weeks/projects/lessons/assignments/resources, they are active by default
- The trigger automatically cascades changes from parent to child content
- Student queries are optimized with indexes to ensure performance
- Inactive content doesn't appear in any student-facing views or statistics
