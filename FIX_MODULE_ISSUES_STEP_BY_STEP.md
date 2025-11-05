# Step-by-Step Guide to Fix Module Issues

## 🎯 The Problem
Students are not seeing content because:
1. Weeks in database don't have modules assigned (NULL values)
2. Module names don't match exactly between enrollments and weeks
3. Queries are too complex and might fail

## ✅ Solution Steps

### Step 1: Run Diagnostic Script

Run the comprehensive diagnostic script to see what's wrong:

```bash
psql -U your_username -d your_database -f migrations/013_COMPREHENSIVE_MODULE_DIAGNOSTIC_AND_FIX.sql
```

This will:
- Show you how many weeks have modules vs don't have modules
- Show you how many enrollments exist
- Normalize all module names to standard format
- Create missing enrollments for paid registrations

### Step 2: Assign Modules to Weeks

**This is the MOST IMPORTANT step!** 

After running the diagnostic script, you MUST assign modules to all weeks that are still NULL.

#### Option A: Via Admin Dashboard (Recommended)
1. Log in as admin
2. Go to Admin Dashboard → Weeks Management
3. For each week that doesn't have a module:
   - Click "Edit"
   - Select a module from the dropdown:
     - "Electrical Design"
     - "Plumbing & Mechanical Design (HVAC)"
     - "MEP Design"
   - Click "Update Week"

#### Option B: Via SQL (Quick Fix)
```sql
-- Example: Assign all NULL weeks to a specific module
-- ADJUST THE MODULE NAME AS NEEDED!
UPDATE weeks 
SET module = 'MEP Design'  -- Change this to the correct module
WHERE module IS NULL OR module = '';

-- OR assign based on week_id ranges
UPDATE weeks 
SET module = CASE
    WHEN week_id BETWEEN 1 AND 10 THEN 'Electrical Design'
    WHEN week_id BETWEEN 11 AND 20 THEN 'Plumbing & Mechanical Design (HVAC)'
    WHEN week_id BETWEEN 21 AND 30 THEN 'MEP Design'
    ELSE module
END
WHERE module IS NULL OR module = '';
```

### Step 3: Verify Enrollments

Check that users have enrollments:

```sql
-- Check enrollments for a specific user
SELECT 
    e.enrollment_id,
    e.user_id,
    e.module,
    e.status,
    u.email,
    u.name
FROM enrollments e
JOIN users u ON e.user_id = u.user_id
WHERE u.email = 'user@example.com';  -- Replace with actual email

-- If no enrollment exists, check registration
SELECT 
    r.id,
    r.email_address,
    r.module,
    r.payment_status,
    r.user_id
FROM register r
WHERE r.email_address = 'user@example.com';  -- Replace with actual email

-- If registration is "Paid" but no enrollment, create it:
INSERT INTO enrollments (user_id, registration_id, module, status)
SELECT 
    user_id,
    id,
    module,
    'active'
FROM register
WHERE email_address = 'user@example.com'
  AND payment_status = 'Paid'
  AND module IS NOT NULL
  AND user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = register.user_id 
        AND e.module = register.module
  );
```

### Step 4: Test as Student

1. Log in as a student who is enrolled
2. Check the dashboard - should show their module
3. Check Weeks - should show weeks for their module
4. Check Projects - should show projects from those weeks
5. Check Assignments - should show assignments from those projects

### Step 5: Check Backend Logs

When testing, watch the backend console logs. You should see:

```
📚 Fetching weeks for user X
   User module: "MEP Design"
   Normalized: "MEP Design"
✅ Found X weeks for module "MEP Design"
```

If you see:
- `⚠️ No enrolled modules for user X` - User doesn't have an enrollment
- `✅ Found 0 weeks` - Weeks don't have modules assigned OR module names don't match
- `🔍 DEBUG: Available weeks in database` - Shows you what modules exist in the database

## 🔍 Troubleshooting

### Issue: "No Module Enrolled" on Dashboard

**Check:**
1. Does enrollment exist?
```sql
SELECT * FROM enrollments WHERE user_id = X AND status = 'active';
```

2. Is enrollment module set?
```sql
SELECT module FROM enrollments WHERE user_id = X AND status = 'active';
```

**Fix:** Create enrollment if missing (see Step 3)

### Issue: Student sees no weeks/projects

**Check:**
1. Do weeks have modules?
```sql
SELECT week_id, title, module FROM weeks WHERE module IS NOT NULL;
```

2. Does module name match exactly?
```sql
-- Check enrollment module
SELECT module FROM enrollments WHERE user_id = X AND status = 'active';

-- Check week modules
SELECT DISTINCT module FROM weeks WHERE module IS NOT NULL;
```

**Fix:** 
- Assign modules to weeks (Step 2)
- Normalize module names (already done by diagnostic script)

### Issue: 500 Errors on Assignments/Quizzes

**Check backend logs** for the exact error. Common issues:
- SQL syntax errors (should be fixed now)
- Missing enrollments (fix with Step 3)

## 📋 Quick Checklist

- [ ] Run diagnostic script (Step 1)
- [ ] Assign modules to ALL weeks (Step 2) ← **CRITICAL**
- [ ] Verify enrollments exist (Step 3)
- [ ] Test as student (Step 4)
- [ ] Check backend logs for errors (Step 5)

## 🚨 Most Common Issue

**95% of the time, the problem is: Weeks don't have modules assigned!**

After running the diagnostic script, you MUST manually assign modules to weeks. The diagnostic script normalizes module names and creates enrollments, but it CANNOT automatically assign modules to weeks because it doesn't know which module each week should belong to.

Use the Admin Dashboard to assign modules to weeks!





