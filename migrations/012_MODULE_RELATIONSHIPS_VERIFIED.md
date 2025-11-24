# Module Relationships Verification

## ✅ Relationships Confirmed

According to the database schema, the module relationships are correctly set up:

### 1. **Weeks → Module (Direct)**
- `weeks.module` column exists ✓
- Index: `idx_weeks_module` ✓

### 2. **Projects → Module (Via Weeks)**
- `projects.week_id` → `weeks.week_id` → `weeks.module` ✓
- No direct module column needed on projects ✓

### 3. **Lessons → Module (Via Projects → Weeks)**
- `lessons.project_id` → `projects.project_id` → `projects.week_id` → `weeks.module` ✓
- No direct module column needed on lessons ✓

### 4. **Assignments → Module (Via Projects OR Lessons)**
- Option A: `assignments.project_id` → `projects.week_id` → `weeks.module` ✓
- Option B: `assignments.lesson_id` → `lessons.project_id` → `projects.week_id` → `weeks.module` ✓
- Query handles both cases correctly ✓

### 5. **Quizzes → Module (Via Projects → Weeks)**
- `quizzes.project_id` → `projects.project_id` → `projects.week_id` → `weeks.module` ✓
- Can also use: `quizzes.lesson_id` → `lessons.project_id` → `projects.week_id` → `weeks.module` ✓

### 6. **Resources → Module (Direct)**
- `resources.module` column exists ✓
- `resources.is_public` column exists ✓
- Indexes: `idx_resources_module`, `idx_resources_is_public` ✓

## 🔧 Required Actions

### Step 1: Run Migration Script
Run the migration script `011_verify_and_fix_module_relationships.sql` to:
1. Ensure all columns exist
2. Normalize module names to standard format:
   - `Electrical Design`
   - `Plumbing & Mechanical Design (HVAC)`
   - `MEP Design`
3. Create missing indexes

### Step 2: Verify Module Names in Database
Run these queries to check module distribution:

```sql
-- Check weeks module distribution
SELECT module, COUNT(*) as count 
FROM weeks 
WHERE module IS NOT NULL 
GROUP BY module 
ORDER BY count DESC;

-- Check resources module distribution
SELECT module, is_public, COUNT(*) as count 
FROM resources 
GROUP BY module, is_public 
ORDER BY module, is_public;

-- Check enrollments module distribution
SELECT module, status, COUNT(*) as count 
FROM enrollments 
GROUP BY module, status 
ORDER BY module, status;

-- Check register module distribution
SELECT module, payment_status, COUNT(*) as count 
FROM register 
WHERE module IS NOT NULL 
GROUP BY module, payment_status 
ORDER BY module, payment_status;
```

### Step 3: Verify No Orphaned Content
Run this query to find content without modules:

```sql
-- Find weeks without modules
SELECT week_id, title, module 
FROM weeks 
WHERE module IS NULL OR module = ''
ORDER BY week_id;

-- Find projects linked to weeks without modules
SELECT 
    p.project_id,
    p.title,
    w.module as week_module
FROM projects p
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = '';

-- Find lessons linked to projects in weeks without modules
SELECT 
    l.lesson_id,
    l.title,
    w.module as week_module
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
LEFT JOIN weeks w ON p.week_id = w.week_id
WHERE w.module IS NULL OR w.module = '';
```

## 📝 Standard Module Names

The system uses these exact module names:
1. **Electrical Design**
2. **Plumbing & Mechanical Design (HVAC)**
3. **MEP Design**

The migration script automatically normalizes variations to these standard names.

## 🔍 How Filtering Works

### Weeks Query
```sql
SELECT * FROM weeks 
WHERE module = 'Electrical Design' -- or other standard name
ORDER BY order_num;
```

### Projects Query
```sql
SELECT p.*, w.module
FROM projects p
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module = 'Electrical Design'
ORDER BY p.order_num;
```

### Lessons Query
```sql
SELECT l.*
FROM lessons l
JOIN projects p ON l.project_id = p.project_id
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module = 'Electrical Design'
ORDER BY l.order_num;
```

### Assignments Query
```sql
SELECT a.*
FROM assignments a
WHERE 
  -- Direct project link
  (a.project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM projects p
    JOIN weeks w ON p.week_id = w.week_id
    WHERE p.project_id = a.project_id AND w.module = 'Electrical Design'
  ))
  OR
  -- Lesson link
  (a.lesson_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM lessons l
    JOIN projects p ON l.project_id = p.project_id
    JOIN weeks w ON p.week_id = w.week_id
    WHERE l.lesson_id = a.lesson_id AND w.module = 'Electrical Design'
  ))
```

### Quizzes Query
```sql
SELECT q.*
FROM quizzes q
JOIN projects p ON q.project_id = p.project_id
JOIN weeks w ON p.week_id = w.week_id
WHERE w.module = 'Electrical Design'
```

### Resources Query
```sql
SELECT r.*
FROM resources r
WHERE 
  is_public = true 
  OR module = 'Electrical Design'
```

## ⚠️ Important Notes

1. **All weeks MUST have a module assigned** - Content cannot be accessed without a module
2. **Module names must match exactly** - The system normalizes common variations automatically
3. **Enrollments control access** - Students only see content from their enrolled module
4. **Public resources** - Resources with `is_public = true` are visible to all users regardless of enrollment

## 🚀 Next Steps

1. Run migration `011_verify_and_fix_module_relationships.sql`
2. Assign modules to all weeks in the admin panel
3. Assign modules to all resources (or mark them as public)
4. Test student access to ensure they only see content from their enrolled module




















