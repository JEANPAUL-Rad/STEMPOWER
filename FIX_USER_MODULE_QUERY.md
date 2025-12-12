# Fix User Module Content Query

## Problem
Your query was returning NULL values for assignments and resources because:
1. **Assignments can be linked to BOTH projects AND lessons**, but your query only checked `a.lesson_id = l.lesson_id`
2. **Resources need proper module matching** or `is_public = true` check
3. **LEFT JOINs create cartesian products** when there are multiple related records

## Solution

### Quick Fix - Updated Single Query

I've created `get_user_module_content.sql` with two options:

**OPTION 1**: Single detailed query that handles:
- Assignments linked to projects (`a_project`)
- Assignments linked to lessons (`a_lesson`)
- Resources matching module OR public
- Proper NULL handling

**OPTION 2** (RECOMMENDED): Separate queries for each content type:
- Weeks query
- Projects query
- Lessons query
- Assignments query (handles both project and lesson links)
- Resources query
- Quizzes query

### Why Use Option 2?

Separate queries are better because:
1. ✅ No NULL confusion - each query only returns relevant data
2. ✅ Easier to process in your backend/frontend
3. ✅ Better performance
4. ✅ Clear data structure per content type

## How to Use

### In Your Backend

You can create separate API endpoints or combine results:

```javascript
// Example: Get all module content for user
const weeks = await getWeeks(userId, module);
const projects = await getProjects(userId, module);
const lessons = await getLessons(userId, module);
const assignments = await getAssignments(userId, module);
const resources = await getResources(userId, module);
const quizzes = await getQuizzes(userId, module);

return {
  weeks,
  projects,
  lessons,
  assignments,
  resources,
  quizzes
};
```

### Key Fixes in the Query

1. **Assignments - Both Types**:
   ```sql
   LEFT JOIN public.assignments a_project ON a_project.project_id = p.project_id
   LEFT JOIN public.assignments a_lesson ON a_lesson.lesson_id = l.lesson_id
   -- Then use COALESCE to get either one
   ```

2. **Resources - Module or Public**:
   ```sql
   LEFT JOIN public.resources r ON 
     (r.module = e.module AND r.module IS NOT NULL) 
     OR (r.is_public = true)
   ```

3. **Content Matching**:
   ```sql
   -- Check both relationship AND direct module field
   LEFT JOIN public.projects p ON 
     (p.week_id = w.week_id) OR 
     (p.module = e.module AND p.module IS NOT NULL)
   ```

## Testing

Run the queries in `get_user_module_content.sql` to verify:
- All weeks show up (10 for Electrical Design)
- All projects show up (6 for Electrical Design)
- All lessons show up (6 for Electrical Design)
- All assignments show up (both project and lesson linked)
- All resources show up (public + module-specific)
- All quizzes show up

## Next Steps

1. Run `complete_module_assignment.sql` if you haven't already
2. Use the queries from `get_user_module_content.sql` 
3. Update your backend API to use these query patterns
4. Test in frontend - all content should now be visible!




















