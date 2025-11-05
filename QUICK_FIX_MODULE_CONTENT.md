# Quick Fix Guide - Module Content Not Showing

## Problem - FIXED ✅
Dashboard is not showing details assigned to module (weeks, projects, lessons, assignments, quizzes, resources).

## Solution Status
✅ **Backend Fixed**: Queries split into separate accurate queries
✅ **Frontend Fixed**: Now shows all 6 content types (Weeks, Projects, Lessons, Quizzes, Assignments, Resources)
✅ **Logging Added**: Warns when module has no content

## IMPORTANT: Database Action Required
The code is fixed, but **you MUST assign modules to weeks** in your Supabase database for content to show!

## Root Causes

1. **Weeks don't have modules assigned** - Most common issue
2. **Module names don't match** - Different variations in database
3. **User doesn't have enrollment/registration** - No module to filter by

## Quick Fix Steps

### Step 1: Run Diagnostic Query
Run the diagnostic script to see what's wrong:
```sql
-- Run migrations/016_DIAGNOSTIC_MODULE_CONTENT.sql
-- Replace USER_EMAIL or USER_ID with actual values
```

### Step 2: Assign Modules to Weeks (CRITICAL)
**This is the most important step!** Weeks MUST have modules assigned.

```sql
-- Example 1: Assign module to specific weeks
UPDATE weeks 
SET module = 'Electrical Design'  -- Change to your module
WHERE week_id IN (1, 2, 3, 4, 5)
  AND (module IS NULL OR module = '');

-- Example 2: Assign module based on week title
UPDATE weeks 
SET module = 'MEP Design'
WHERE title ILIKE '%mep%'
  AND (module IS NULL OR module = '');

-- Example 3: Assign module to all weeks without module (CAREFUL!)
UPDATE weeks 
SET module = 'Electrical Design'  -- Change to your default module
WHERE module IS NULL OR module = '';
```

### Step 3: Normalize Module Names
Run the normalization script:
```sql
-- Run migrations/015_COMPREHENSIVE_MODULE_FIX_SUPABASE.sql
-- This will normalize all module names to standard format
```

### Step 4: Verify Content is Linked
Check if content exists for the module:
```sql
-- Replace 'Electrical Design' with your module name
SELECT 
    w.module,
    COUNT(DISTINCT w.week_id) as weeks,
    COUNT(DISTINCT p.project_id) as projects,
    COUNT(DISTINCT l.lesson_id) as lessons,
    COUNT(DISTINCT q.quiz_id) as quizzes,
    COUNT(DISTINCT a.assignment_id) as assignments
FROM weeks w
LEFT JOIN projects p ON w.week_id = p.week_id
LEFT JOIN lessons l ON p.project_id = l.project_id
LEFT JOIN quizzes q ON (q.project_id = p.project_id OR q.lesson_id = l.lesson_id)
LEFT JOIN assignments a ON (a.project_id = p.project_id OR a.lesson_id = l.lesson_id)
WHERE w.module = 'Electrical Design'  -- Replace with your module
GROUP BY w.module;
```

### Step 5: Check User Enrollment
Make sure user has enrollment or registration:
```sql
-- Check user's enrollment
SELECT 
    e.module,
    e.status,
    e.enrolled_at,
    u.email
FROM enrollments e
JOIN users u ON e.user_id = u.user_id
WHERE u.email = 'user@example.com'  -- Replace with user email
  AND e.status = 'active';

-- Check user's registration
SELECT 
    r.module,
    r.payment_status,
    r.created_at,
    r.email_address
FROM register r
WHERE r.email_address = 'user@example.com'  -- Replace with user email
ORDER BY r.created_at DESC;
```

## Standard Module Names

Use these EXACT names:
- `Electrical Design`
- `Plumbing & Mechanical Design (HVAC)`
- `MEP Design`

## Complete Fix Script

Run this complete script to fix everything at once:

```sql
-- 1. Assign modules to weeks (MODIFY AS NEEDED)
UPDATE weeks 
SET module = 'Electrical Design'
WHERE week_id BETWEEN 1 AND 5  -- Change range as needed
  AND (module IS NULL OR module = '');

-- 2. Normalize all module names
UPDATE weeks 
SET module = CASE
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%mep%'
        THEN 'Electrical Design'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%'
        THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%'
        THEN 'MEP Design'
    ELSE module
END
WHERE module IS NOT NULL AND module != '';

-- 3. Verify fix
SELECT 
    module,
    COUNT(*) as weeks_count
FROM weeks
WHERE module IS NOT NULL AND module != ''
GROUP BY module;
```

## After Running Fix

1. **Restart your backend server** (if needed)
2. **Clear browser cache** and login again
3. **Check dashboard** - should now show module content
4. **Verify in console** - Check backend logs for module stats

## Troubleshooting

### Still showing 0 content?
1. Check if weeks have modules: `SELECT * FROM weeks WHERE module IS NOT NULL;`
2. Check if user has enrollment: `SELECT * FROM enrollments WHERE user_id = X AND status = 'active';`
3. Check module name matches exactly: `SELECT DISTINCT module FROM weeks;`

### Module stats showing 0?
- Weeks table doesn't have the module assigned
- Module name doesn't match exactly (check case sensitivity)
- Run normalization script to fix module names

### Dashboard shows empty enrolled_modules?
- User doesn't have active enrollment
- User doesn't have registration with module
- Create enrollment manually if needed

## Files Modified

1. **Backend**: `src/models/student.model.js` - Enhanced module stats query to include quizzes, assignments, resources
2. **Database**: Run migration scripts to assign modules and normalize names

## Need More Help?

Run the diagnostic queries in `migrations/016_DIAGNOSTIC_MODULE_CONTENT.sql` to identify specific issues.

