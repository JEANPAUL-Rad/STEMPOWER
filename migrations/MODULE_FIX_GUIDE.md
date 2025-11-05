# Module Relationship Fix Guide

## Problem
Students are not seeing weeks, projects, lessons, assignments, quizzes, and resources assigned to their enrolled module because:
1. Module names in database might not match exactly between tables
2. Some weeks/resources might have NULL modules
3. Module name variations (case, spacing) causing mismatches

## Database Schema Verification

### ✅ Verified Relationships:
1. **Weeks → module** (direct) ✓
   - `weeks.module` column exists

2. **Projects → week_id → weeks.module** ✓
   - `projects.week_id` FK → `weeks.week_id`

3. **Lessons → project_id → projects → weeks.module** ✓
   - `lessons.project_id` FK → `projects.project_id`

4. **Assignments → (project_id OR lesson_id) → weeks.module** ✓
   - `assignments.project_id` FK → `projects.project_id`
   - `assignments.lesson_id` FK → `lessons.lesson_id`

5. **Quizzes → project_id → projects → weeks.module** ✓
   - `quizzes.project_id` FK → `projects.project_id`

6. **Resources → module** (direct) ✓
   - `resources.module` column exists

## Standard Module Names

The system uses exactly three module names:
1. `Electrical Design`
2. `Plumbing & Mechanical Design (HVAC)`
3. `MEP Design`

## Migration Steps

### Step 1: Run Migration 009
This ensures all relationships and indexes exist:
```sql
\i migrations/009_verify_and_fix_module_relationships.sql
```

### Step 2: Check Current Data
Run the diagnostic queries in `010_normalize_module_names.sql` to see:
- What module names currently exist
- Which records need normalization
- Which weeks/resources have NULL modules

### Step 3: Normalize Module Names
After reviewing the diagnostic results, uncomment and run the UPDATE statements in `010_normalize_module_names.sql` to normalize all module names.

### Step 4: Verify
Run the verification queries at the end of `010_normalize_module_names.sql` to ensure:
- All module names match the three standard formats
- No unexpected variations exist
- All weeks have modules assigned (except if intentionally NULL)

## Backend Fixes Applied

### ✅ All queries updated to handle module matching:
- `getWeeks()` - Fetches weeks by module with flexible matching
- `getAllProjects()` - Filters projects through weeks → module
- `getProjectsByWeek()` - Verifies access by module
- `getProjectDetails()` - Verifies access by module
- `getAllProjectQuizzes()` - Filters quizzes by module
- `getQuizDetails()` - Verifies access by module
- `getResources()` - Filters resources by module
- `getProgress()` - Tracks progress by module
- `getStudentAssignments()` - Filters assignments by module (handles both project and lesson links)
- `getSubmissionsByUser()` - Filters submissions by module
- `getAssignmentById()` - Verifies access by module
- `getCourses()` - Fetches courses by module
- `getProjectsByWeekDashboard()` - Dashboard projects by module
- `getRecentActivity()` - Activity filtered by module
- `getMyDashboard()` - All stats queries filtered by module

### ✅ Module Normalization Function
Added `normalizeModule()` helper function in `student.model.js` that maps variations to standard names.

### ✅ Debug Logging
Added comprehensive logging to help identify module matching issues.

## Frontend Fixes Applied

### ✅ WeeksManagement.jsx
- Removed outdated module option: 'Electrical & Plumbing Basics'
- Module field is required in the form
- Module selection dropdown shows only the three standard modules

## Common Issues & Solutions

### Issue: Students see "No Module Enrolled"
**Solution:**
1. Check if user has active enrollment: `SELECT * FROM enrollments WHERE user_id = X AND status = 'active'`
2. Check if registration exists: `SELECT * FROM register WHERE user_id = X OR email_address = 'user@email.com'`
3. If registration exists but no enrollment, payment status might be 'Pending' - need to create enrollment

### Issue: Weeks/Projects not showing
**Solution:**
1. Check if week has module: `SELECT week_id, title, module FROM weeks WHERE week_id = X`
2. Check if user's module matches week's module exactly
3. Run normalization script to fix module name mismatches

### Issue: Resources not showing
**Solution:**
1. Check if resource has module set OR `is_public = true`
2. Verify module name matches user's enrolled module
3. Check query logs for module matching attempts

## Testing Checklist

After running migrations:

1. ✅ Create a week with module "MEP Design"
2. ✅ Create a project in that week
3. ✅ Create a lesson in that project
4. ✅ Create an assignment linked to the project
5. ✅ Create a quiz linked to the project
6. ✅ Create a resource with module "MEP Design"
7. ✅ Register a user for "MEP Design" module
8. ✅ Login as that user
9. ✅ Verify user sees the week, project, lesson, assignment, quiz, and resource

## SQL Queries for Quick Diagnosis

```sql
-- Check user's enrolled module:
SELECT e.*, r.module as reg_module, r.payment_status
FROM enrollments e
LEFT JOIN register r ON e.registration_id = r.id
WHERE e.user_id = YOUR_USER_ID AND e.status = 'active';

-- Check what weeks exist for a module:
SELECT week_id, title, module 
FROM weeks 
WHERE LOWER(TRIM(module)) = LOWER('MEP Design')
   OR module = 'MEP Design';

-- Check what content is linked to weeks:
SELECT 
    w.week_id,
    w.title as week_title,
    w.module as week_module,
    COUNT(DISTINCT p.project_id) as projects_count,
    COUNT(DISTINCT l.lesson_id) as lessons_count
FROM weeks w
LEFT JOIN projects p ON w.week_id = p.week_id
LEFT JOIN lessons l ON p.project_id = l.project_id
WHERE w.module = 'MEP Design'
GROUP BY w.week_id, w.title, w.module;
```

## Next Steps

1. Run migration 009
2. Review diagnostic queries from migration 010
3. Normalize module names if needed
4. Test with a user account
5. Check backend logs for module matching attempts
6. Verify all content is visible in student dashboard

