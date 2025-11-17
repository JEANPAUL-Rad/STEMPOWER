# Quick Start: Module Relationship Fix

## ✅ What Has Been Fixed

1. **Database Schema**: All required columns and relationships exist:
   - ✅ `weeks.module` column
   - ✅ `resources.module` column  
   - ✅ `resources.is_public` column
   - ✅ `enrollments` table with proper indexes
   - ✅ `register.user_id` foreign key

2. **Backend Queries**: All student queries now filter by enrolled module:
   - ✅ Weeks filtered by `weeks.module`
   - ✅ Projects filtered via `projects → weeks.module`
   - ✅ Lessons filtered via `lessons → projects → weeks.module`
   - ✅ Assignments filtered via both `project_id` and `lesson_id` paths
   - ✅ Quizzes filtered via `quizzes → projects → weeks.module`
   - ✅ Resources filtered by `resources.module` or `is_public = true`

3. **Frontend**: 
   - ✅ Module stored in localStorage on login
   - ✅ Dashboard displays correct module
   - ✅ Admin can assign modules to weeks
   - ✅ Admin can edit payment status to trigger enrollment

## 🚀 Steps to Complete Setup

### Step 1: Run Migration Script

Connect to your PostgreSQL database and run:

```bash
# Option 1: Using psql
psql -U your_username -d your_database -f migrations/011_verify_and_fix_module_relationships.sql

# Option 2: Using pgAdmin
# Open the SQL editor and paste the contents of:
# migrations/011_verify_and_fix_module_relationships.sql
# Then execute
```

This migration will:
- Ensure all columns exist
- Normalize all module names to standard format:
  - `Electrical Design`
  - `Plumbing & Mechanical Design (HVAC)`
  - `MEP Design`
- Create missing indexes

### Step 2: Assign Modules to Existing Weeks

If you have existing weeks without modules:

1. **Via Admin Panel** (Recommended):
   - Go to Admin Dashboard → Weeks Management
   - Edit each week and assign a module from the dropdown
   - Save

2. **Via SQL** (Quick):
```sql
-- Example: Assign all weeks to a specific module (adjust as needed)
UPDATE weeks 
SET module = 'Electrical Design'
WHERE module IS NULL OR module = '';

-- OR assign based on week_id ranges or titles
UPDATE weeks 
SET module = CASE
    WHEN week_id BETWEEN 1 AND 10 THEN 'Electrical Design'
    WHEN week_id BETWEEN 11 AND 20 THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN week_id BETWEEN 21 AND 30 THEN 'MEP Design'
    ELSE module
END
WHERE module IS NULL OR module = '';
```

### Step 3: Assign Modules to Resources (Optional)

Resources can be:
- **Module-specific**: Set `module = 'Electrical Design'` (or other)
- **Public**: Set `is_public = true` (visible to all)

```sql
-- Make all resources public (if they should be accessible to everyone)
UPDATE resources 
SET is_public = true
WHERE is_public IS NULL OR is_public = false;

-- OR assign modules to resources
UPDATE resources 
SET module = 'Electrical Design'
WHERE module IS NULL AND is_public = false;
```

### Step 4: Verify Everything Works

1. **Check Module Distribution**:
```sql
-- Should show weeks for each module
SELECT module, COUNT(*) as count 
FROM weeks 
WHERE module IS NOT NULL 
GROUP BY module;

-- Should show enrollments for each module
SELECT module, status, COUNT(*) as count 
FROM enrollments 
GROUP BY module, status;
```

2. **Test Student Access**:
   - Log in as a student enrolled in a specific module
   - Check dashboard - should only show content from that module
   - Check weeks/projects/lessons - should be filtered correctly

3. **Check Console Logs**:
   - Backend logs should show: `📚 Fetching weeks for user X with module: "Y"`
   - If you see `⚠️ No enrolled modules`, enrollment may not be created

### Step 5: Create Enrollments for Existing Paid Registrations

If you have registrations marked as "Paid" but no enrollments:

```sql
-- Check for paid registrations without enrollments
SELECT r.id, r.email_address, r.module, r.payment_status, e.enrollment_id
FROM register r
LEFT JOIN enrollments e ON r.user_id = e.user_id AND r.module = e.module AND e.status = 'active'
WHERE r.payment_status = 'Paid'
  AND r.module IS NOT NULL
  AND r.user_id IS NOT NULL
  AND e.enrollment_id IS NULL;

-- If needed, create enrollments manually:
INSERT INTO enrollments (user_id, registration_id, module, status)
SELECT 
    r.user_id,
    r.id,
    r.module,
    'active'
FROM register r
LEFT JOIN enrollments e ON r.user_id = e.user_id AND r.module = e.module AND e.status = 'active'
WHERE r.payment_status = 'Paid'
  AND r.module IS NOT NULL
  AND r.user_id IS NOT NULL
  AND e.enrollment_id IS NULL;
```

## 🔍 Troubleshooting

### Problem: "No Module Enrolled" on Dashboard

**Solution**:
1. Check if enrollment exists:
```sql
SELECT * FROM enrollments 
WHERE user_id = YOUR_USER_ID AND status = 'active';
```

2. Check if registration is paid and has module:
```sql
SELECT * FROM register 
WHERE user_id = YOUR_USER_ID OR email_address = 'user@example.com';
```

3. If registration is paid but no enrollment, run Step 5 above

### Problem: Student sees no content

**Solution**:
1. Verify week has module assigned:
```sql
SELECT week_id, title, module FROM weeks WHERE week_id = WEEK_ID;
```

2. Verify module names match exactly:
```sql
-- Check enrollment module
SELECT module FROM enrollments WHERE user_id = USER_ID AND status = 'active';

-- Check week module  
SELECT module FROM weeks WHERE week_id = WEEK_ID;

-- These should match exactly (case-sensitive)
```

3. Run the normalization migration (Step 1) to fix module name mismatches

### Problem: 500 Error on Assignments/Submissions

**Solution**: This should already be fixed. The queries now return empty arrays instead of errors when no enrollment is found. If you still see errors:
1. Check backend logs for the exact error
2. Verify `getUserEnrolledModules` is working correctly
3. Ensure `register.user_id` is linked correctly

## 📋 Verification Checklist

- [ ] Migration script executed successfully
- [ ] All weeks have modules assigned
- [ ] Module names normalized (check with SQL queries)
- [ ] Resources have modules or are marked public
- [ ] Enrollments exist for all paid registrations
- [ ] Student dashboard shows correct module
- [ ] Student can see weeks/projects/lessons for their module
- [ ] Student cannot see content from other modules
- [ ] Assignments and submissions load correctly (no 500 errors)

## 📞 Need Help?

If issues persist:
1. Check backend console logs for detailed error messages
2. Run diagnostic queries from `012_MODULE_RELATIONSHIPS_VERIFIED.md`
3. Verify all migrations have been applied
4. Ensure database schema matches the expected structure

















