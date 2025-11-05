-- ==============================
-- MIGRATION 10: Normalize Module Names
-- ==============================
-- This script normalizes all module names to the three standard formats:
-- 1. 'Electrical Design'
-- 2. 'Plumbing & Mechanical Design (HVAC)'
-- 3. 'MEP Design'

-- IMPORTANT: Review the results before running the UPDATE statements!
-- Uncomment the UPDATE statements after verifying they will work correctly.

-- ==============================
-- STEP 1: Check current module name variations
-- ==============================
-- Run these SELECT queries first to see what needs to be normalized:

-- Check weeks table:
SELECT 
    'weeks' as table_name,
    week_id,
    title,
    module as current_module,
    CASE 
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' THEN 'Electrical Design'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' THEN 'Plumbing & Mechanical Design (HVAC)'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' THEN 'MEP Design'
        ELSE module
    END as normalized_module
FROM weeks
WHERE module IS NOT NULL
ORDER BY module, week_id;

-- Check resources table:
SELECT 
    'resources' as table_name,
    resource_id,
    title,
    module as current_module,
    CASE 
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' THEN 'Electrical Design'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' THEN 'Plumbing & Mechanical Design (HVAC)'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' THEN 'MEP Design'
        ELSE module
    END as normalized_module
FROM resources
WHERE module IS NOT NULL
ORDER BY module, resource_id;

-- Check enrollments table:
SELECT 
    'enrollments' as table_name,
    enrollment_id,
    user_id,
    module as current_module,
    CASE 
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' THEN 'Electrical Design'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' THEN 'Plumbing & Mechanical Design (HVAC)'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' THEN 'MEP Design'
        ELSE module
    END as normalized_module
FROM enrollments
WHERE module IS NOT NULL
ORDER BY module, enrollment_id;

-- Check register table:
SELECT 
    'register' as table_name,
    id,
    full_name,
    email_address,
    module as current_module,
    CASE 
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' THEN 'Electrical Design'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' THEN 'Plumbing & Mechanical Design (HVAC)'
        WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' THEN 'MEP Design'
        ELSE module
    END as normalized_module
FROM register
WHERE module IS NOT NULL
ORDER BY module, id;

-- ==============================
-- STEP 2: Normalize module names
-- ==============================
-- UNCOMMENT THESE AFTER REVIEWING STEP 1 RESULTS:

-- Normalize weeks table:
/*
UPDATE weeks 
SET module = CASE 
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
    THEN 'Electrical Design'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' 
    THEN 'Plumbing & Mechanical Design (HVAC)'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' 
    THEN 'MEP Design'
    
    ELSE module
END
WHERE module IS NOT NULL
  AND LOWER(TRIM(module)) NOT IN ('electrical design', 'plumbing & mechanical design (hvac)', 'mep design');
*/

-- Normalize resources table:
/*
UPDATE resources 
SET module = CASE 
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
    THEN 'Electrical Design'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' 
    THEN 'Plumbing & Mechanical Design (HVAC)'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' 
    THEN 'MEP Design'
    
    ELSE module
END
WHERE module IS NOT NULL
  AND LOWER(TRIM(module)) NOT IN ('electrical design', 'plumbing & mechanical design (hvac)', 'mep design');
*/

-- Normalize enrollments table:
/*
UPDATE enrollments 
SET module = CASE 
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
    THEN 'Electrical Design'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' 
    THEN 'Plumbing & Mechanical Design (HVAC)'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' 
    THEN 'MEP Design'
    
    ELSE module
END
WHERE module IS NOT NULL
  AND LOWER(TRIM(module)) NOT IN ('electrical design', 'plumbing & mechanical design (hvac)', 'mep design');
*/

-- Normalize register table:
/*
UPDATE register 
SET module = CASE 
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%electrical%' 
         AND LOWER(TRIM(COALESCE(module, ''))) NOT LIKE '%plumbing%' 
    THEN 'Electrical Design'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%plumbing%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%mechanical%' 
         OR LOWER(TRIM(COALESCE(module, ''))) LIKE '%hvac%' 
    THEN 'Plumbing & Mechanical Design (HVAC)'
    
    WHEN LOWER(TRIM(COALESCE(module, ''))) LIKE '%mep%' 
    THEN 'MEP Design'
    
    ELSE module
END
WHERE module IS NOT NULL
  AND LOWER(TRIM(module)) NOT IN ('electrical design', 'plumbing & mechanical design (hvac)', 'mep design');
*/

-- ==============================
-- STEP 3: Verification queries
-- ==============================
-- Run these after normalization to verify:

-- Check all unique module names after normalization:
SELECT 'Weeks' as table_name, COUNT(*) as count, module 
FROM weeks 
WHERE module IS NOT NULL 
GROUP BY module 
UNION ALL
SELECT 'Resources' as table_name, COUNT(*) as count, module 
FROM resources 
WHERE module IS NOT NULL 
GROUP BY module 
UNION ALL
SELECT 'Enrollments' as table_name, COUNT(*) as count, module 
FROM enrollments 
WHERE module IS NOT NULL 
GROUP BY module 
UNION ALL
SELECT 'Register' as table_name, COUNT(*) as count, module 
FROM register 
WHERE module IS NOT NULL 
GROUP BY module 
ORDER BY table_name, module;

-- Check for weeks without modules (should be fixed by admin):
SELECT 
    week_id, 
    title, 
    module,
    CASE 
        WHEN module IS NULL THEN '⚠️ MISSING MODULE - Students will not see this week!'
        ELSE '✓ OK'
    END as status
FROM weeks
ORDER BY module NULLS LAST, week_id;

-- Check for resources without modules:
SELECT 
    resource_id, 
    title, 
    type,
    module,
    is_public,
    CASE 
        WHEN module IS NULL AND is_public = false THEN '⚠️ MISSING MODULE - Not visible to anyone!'
        WHEN module IS NULL AND is_public = true THEN '✓ Public resource (OK)'
        ELSE '✓ OK'
    END as status
FROM resources
ORDER BY module NULLS LAST, resource_id;

-- ==============================
-- END OF MIGRATION
-- ==============================

