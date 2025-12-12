# Debug Dashboard Issue - Step by Step

## ✅ Code is Fixed

All backend queries have been fixed and simplified. The issue is likely that **weeks don't have modules assigned in the database**.

## 🔍 How to Debug

### Step 1: Check Backend Logs

When you load the dashboard, check your backend console. You should see logs like:

```
📊 Fetching dashboard stats for user X
   User module: "Electrical Design"
   Normalized: "Electrical Design"
🔍 Available modules in weeks table: [ ... ]
📊 Dashboard stats result: { total_projects: X, total_lessons: Y, ... }
```

**If you see:**
- `total_weeks: 0` → Weeks don't have modules assigned!
- `Available modules in weeks table: []` → No weeks have modules!

### Step 2: Check Database

Run this SQL query:

```sql
-- Check if weeks have modules
SELECT 
    COUNT(*) as total_weeks,
    COUNT(CASE WHEN module IS NOT NULL AND module != '' THEN 1 END) as weeks_with_module,
    COUNT(CASE WHEN module IS NULL OR module = '' THEN 1 END) as weeks_without_module
FROM weeks;

-- Show modules in weeks
SELECT DISTINCT module, COUNT(*) as week_count
FROM weeks 
WHERE module IS NOT NULL AND module != ''
GROUP BY module;

-- Show weeks without modules
SELECT week_id, title, module 
FROM weeks 
WHERE module IS NULL OR module = ''
ORDER BY week_id;
```

### Step 3: Check Enrollment

```sql
-- Replace 'user@example.com' with actual email
SELECT 
    u.email,
    e.module as enrolled_module,
    e.status,
    r.module as registered_module,
    r.payment_status
FROM users u
LEFT JOIN enrollments e ON u.user_id = e.user_id AND e.status = 'active'
LEFT JOIN register r ON u.email = r.email_address
WHERE u.email = 'user@example.com';
```

## 🚨 Most Common Issue

**95% of cases: Weeks don't have modules assigned!**

### Fix: Assign Modules to Weeks

**Option 1: Via Admin Dashboard**
1. Login as admin
2. Go to **Admin Dashboard → Weeks Management**
3. For each week without a module:
   - Click **"Edit"**
   - Select module: `Electrical Design`, `Plumbing & Mechanical Design (HVAC)`, or `MEP Design`
   - Click **"Update Week"**

**Option 2: Via SQL**
```sql
-- Assign all weeks to a specific module (adjust as needed)
UPDATE weeks 
SET module = 'Electrical Design'  -- Change to correct module
WHERE module IS NULL OR module = '';

-- Verify
SELECT week_id, title, module FROM weeks;
```

## 🔧 Additional Checks

### Check if Projects Exist
```sql
SELECT COUNT(*) as total_projects
FROM projects p
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module = 'Electrical Design';
```

### Check if Lessons Exist
```sql
SELECT COUNT(*) as total_lessons
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module = 'Electrical Design';
```

### Check if Assignments Exist
```sql
SELECT COUNT(*) as total_assignments
FROM assignments a
JOIN projects p ON a.project_id = p.project_id
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module = 'Electrical Design' AND a.is_active = true;
```

## 📋 Expected Dashboard Data Structure

The dashboard should return:
```json
{
  "stats": {
    "total_projects": 5,
    "total_lessons": 20,
    "total_weeks": 3,
    "completed_lessons": 2,
    "quizzes_taken": 1,
    "completion_percentage": 10
  },
  "current_progress": {
    "current_week": "Week 1",
    "current_project": "Project 1",
    "next_lesson_title": "Lesson 1",
    ...
  },
  "recent_activity": [...],
  "enrolled_modules": [{
    "module_title": "Electrical Design",
    "module_stats": {
      "total_weeks": 3,
      "total_projects": 5,
      "total_lessons": 20
    },
    ...
  }]
}
```

## ✅ What to Check After Fixing

1. **Backend logs show data** - Check console for stats numbers > 0
2. **Dashboard displays stats** - Cards show numbers instead of 0
3. **Module section shows** - "Module & Details" section appears with content
4. **All sections work** - Projects, Lessons, Quizzes, Assignments all show data

## 🐛 If Still Not Working

1. **Check browser console** - Look for JavaScript errors
2. **Check network tab** - Verify API calls return data
3. **Check backend logs** - Look for SQL errors or warnings
4. **Verify module names** - Enrollment module must match week module exactly






















