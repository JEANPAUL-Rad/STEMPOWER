# 🎓 Course Access Restriction - Theoretical Implementation

## 📋 Overview

This document explains **theoretically** how to implement a system where registered students can only access course content (courses, quizzes, assignments, resources) for the specific module/course they registered for.

---

## 🔗 Current System Structure

### **Current State:**

```
Users Table:
  - user_id, email, name, role, status

Register Table:
  - id, full_name, email_address, module, payment_status

Course Structure:
  - weeks (course containers)
  - projects (within weeks)
  - lessons (within projects)
  - quizzes (linked to projects)
  - assignments (linked to projects)
  - resources (general learning materials)
```

### **Problem:**
Currently, there's **no connection** between:
- User registration (`register` table) → User account (`users` table)
- Registration `module` → Course content (`weeks`/`projects`/`lessons`)
- All students see ALL courses regardless of registration

---

## 🎯 Theoretical Solution: Enrollment-Based Access Control

### **Step 1: Link Registration to User Account**

#### **Concept:**
After payment confirmation, link the `register` entry to the `users` account.

```
Registration Flow:
  1. Student registers → Creates entry in `register` table with `module` field
  2. Admin confirms payment → Updates `register.payment_status = 'Paid'`
  3. System creates/links user account → Creates entry in `users` table
  4. Link registration to user → Create `user_registrations` table OR add `user_id` to `register`
```

#### **Database Design Option A: Add user_id to register table**
```sql
ALTER TABLE register ADD COLUMN user_id INTEGER REFERENCES users(user_id);
```

#### **Database Design Option B: Create enrollment table**
```sql
CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    registration_id INTEGER REFERENCES register(id),
    module VARCHAR(100) NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' -- active, completed, cancelled
);
```

---

### **Step 2: Link Course Content to Modules**

#### **Concept:**
Associate each `week` (course) with a specific `module` so we can filter which students can access it.

```
Course Structure:
  Week → Module (e.g., "Archicad Basic", "Archicad Advanced")
    └── Projects (linked to week)
        └── Lessons (linked to project)
            └── Quizzes/Assignments (linked to project)
```

#### **Database Design:**
```sql
-- Add module field to weeks table
ALTER TABLE weeks ADD COLUMN module VARCHAR(100);

-- Or create a separate course_modules table for flexibility
CREATE TABLE course_modules (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Link weeks to modules
ALTER TABLE weeks ADD COLUMN module_id INTEGER REFERENCES course_modules(module_id);
```

---

### **Step 3: Filter Course Access Based on Enrollment**

#### **Concept:**
When a student requests course data, the backend should:
1. Identify the student's enrolled modules (from `register` or `enrollments`)
2. Filter course content to only show weeks/courses matching those modules
3. Apply the same filtering to projects, lessons, quizzes, assignments, resources

---

## 🔐 Implementation Flow

### **Flow 1: Student Registration & Enrollment**

```
1. Student registers at /courses
   ↓
2. Creates entry in `register` table with:
   - email_address
   - module (e.g., "Archicad Basic")
   - payment_status = 'Pending'
   ↓
3. Student completes payment
   ↓
4. Admin updates payment_status = 'Paid'
   ↓
5. System creates user account (if not exists) OR links to existing user
   ↓
6. Create enrollment record:
   INSERT INTO enrollments (user_id, registration_id, module, status)
   VALUES (user_id, registration_id, 'Archicad Basic', 'active')
```

---

### **Flow 2: Student Accessing Courses**

```
Student Login
   ↓
GET /api/v1/student/dashboard/courses
   ↓
Backend:
  1. Extract user_id from JWT token
   ↓
  2. Query enrolled modules:
     SELECT module FROM enrollments 
     WHERE user_id = ? AND status = 'active'
     Result: ['Archicad Basic']
   ↓
  3. Filter weeks/courses by module:
     SELECT * FROM weeks 
     WHERE module IN ('Archicad Basic')
     Result: Only weeks for "Archicad Basic" module
   ↓
  4. Return filtered courses to frontend
   ↓
Frontend displays only enrolled courses
```

---

### **Flow 3: Accessing Course Structure**

```
Student clicks on a course
   ↓
GET /api/v1/student/weeks/:week_id/projects
   ↓
Backend:
  1. Verify user has access to this week:
     SELECT w.* FROM weeks w
     JOIN enrollments e ON w.module = e.module
     WHERE w.week_id = ? AND e.user_id = ? AND e.status = 'active'
   ↓
  2. If no access → Return 403 Forbidden
   ↓
  3. If access granted → Return projects for that week
   ↓
GET /api/v1/student/projects/:project_id/lessons
   ↓
Backend:
  1. Verify project belongs to accessible week:
     SELECT p.* FROM projects p
     JOIN weeks w ON p.week_id = w.week_id
     JOIN enrollments e ON w.module = e.module
     WHERE p.project_id = ? AND e.user_id = ? AND e.status = 'active'
   ↓
  2. Return lessons for that project
```

---

### **Flow 4: Quiz Access**

```
Student accesses quiz
   ↓
GET /api/v1/student/quizzes/:quiz_id
   ↓
Backend:
  1. Verify quiz belongs to accessible course:
     SELECT q.* FROM quizzes q
     JOIN projects p ON q.project_id = p.project_id
     JOIN weeks w ON p.week_id = w.week_id
     JOIN enrollments e ON w.module = e.module
     WHERE q.quiz_id = ? AND e.user_id = ? AND e.status = 'active'
   ↓
  2. If no access → Return 403 Forbidden
   ↓
  3. If access granted → Return quiz details
   ↓
Student submits quiz
   ↓
POST /api/v1/student/quizzes/:quiz_id/submit
   ↓
Backend repeats same verification before accepting submission
```

---

### **Flow 5: Assignment Access**

```
Student views assignments
   ↓
GET /api/v1/student/assignments
   ↓
Backend:
  1. Get user's enrolled modules
   ↓
  2. Filter assignments by accessible projects:
     SELECT a.* FROM assignments a
     JOIN projects p ON a.project_id = p.project_id
     JOIN weeks w ON p.week_id = w.week_id
     JOIN enrollments e ON w.module = e.module
     WHERE e.user_id = ? AND e.status = 'active'
   ↓
  3. Return only assignments from enrolled courses
```

---

### **Flow 6: Resource Access**

```
Student views resources
   ↓
GET /api/v1/student/resources
   ↓
Backend:
   Option A: Module-specific resources
     SELECT r.* FROM resources r
     JOIN enrollments e ON r.module = e.module
     WHERE e.user_id = ? AND e.status = 'active'
   
   Option B: General resources (accessible to all)
     SELECT r.* FROM resources r
     WHERE r.is_public = true OR r.module IN (
       SELECT module FROM enrollments 
       WHERE user_id = ? AND status = 'active'
     )
```

---

### **Flow 7: Real-time Quiz Sessions**

```
Student joins quiz session via WebSocket
   ↓
WebSocket: join_quiz_session
   ↓
Backend Verification:
  1. Get quiz_id from session
   ↓
  2. Verify student has access to this quiz:
     SELECT q.* FROM quiz_sessions qs
     JOIN quizzes q ON qs.quiz_id = q.quiz_id
     JOIN projects p ON q.project_id = p.project_id
     JOIN weeks w ON p.week_id = w.week_id
     JOIN enrollments e ON w.module = e.module
     WHERE qs.session_id = ? 
       AND qs.user_id = ? 
       AND e.user_id = ?
       AND e.status = 'active'
   ↓
  3. If no access → Emit error and disconnect
   ↓
  4. If access granted → Allow WebSocket connection
```

---

## 🗄️ Database Schema Changes

### **1. Enrollment Table (Recommended)**

```sql
CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    registration_id INTEGER REFERENCES register(id),
    module VARCHAR(100) NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    expires_at TIMESTAMP, -- Optional: for course expiration
    CONSTRAINT unique_user_module UNIQUE (user_id, module)
);

-- Index for fast lookups
CREATE INDEX idx_enrollments_user_module ON enrollments(user_id, module, status);
```

### **2. Link Weeks to Modules**

```sql
-- Option A: Direct module field
ALTER TABLE weeks ADD COLUMN module VARCHAR(100);

-- Option B: Module table (more flexible)
CREATE TABLE course_modules (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE weeks ADD COLUMN module_id INTEGER REFERENCES course_modules(module_id);
```

### **3. Link Resources to Modules (Optional)**

```sql
ALTER TABLE resources ADD COLUMN module VARCHAR(100);
-- OR
ALTER TABLE resources ADD COLUMN module_id INTEGER REFERENCES course_modules(module_id);
ALTER TABLE resources ADD COLUMN is_public BOOLEAN DEFAULT false; -- Public resources for all
```

---

## 🔒 Backend Implementation Pattern

### **Middleware: Check Course Access**

```javascript
// middleware/checkCourseAccess.js
export async function checkCourseAccess(req, res, next) {
  const user_id = req.user.user_id;
  const week_id = req.params.week_id || req.body.week_id;
  
  // Get user's enrolled modules
  const enrollments = await sql`
    SELECT module FROM enrollments 
    WHERE user_id = ${user_id} AND status = 'active'
  `;
  
  if (enrollments.length === 0) {
    return res.status(403).json({ 
      message: 'No active course enrollment found' 
    });
  }
  
  const modules = enrollments.map(e => e.module);
  
  // Verify week belongs to enrolled module
  const week = await sql`
    SELECT * FROM weeks 
    WHERE week_id = ${week_id} 
      AND module = ANY(${modules})
  `;
  
  if (week.length === 0) {
    return res.status(403).json({ 
      message: 'You do not have access to this course' 
    });
  }
  
  req.enrolledModules = modules; // Store for use in controllers
  next();
}
```

### **Helper Function: Get Enrolled Modules**

```javascript
// utils/enrollment.js
export async function getUserEnrolledModules(user_id) {
  const enrollments = await sql`
    SELECT DISTINCT module FROM enrollments 
    WHERE user_id = ${user_id} AND status = 'active'
  `;
  return enrollments.map(e => e.module);
}

export async function hasAccessToModule(user_id, module) {
  const access = await sql`
    SELECT 1 FROM enrollments 
    WHERE user_id = ${user_id} 
      AND module = ${module} 
      AND status = 'active'
    LIMIT 1
  `;
  return access.length > 0;
}
```

### **Modified Student Queries**

```javascript
// models/student.model.js

// Modified getCourses - Filter by enrollment
export async function getCourses(user_id) {
  // Get user's enrolled modules
  const modules = await sql`
    SELECT module FROM enrollments 
    WHERE user_id = ${user_id} AND status = 'active'
  `;
  
  if (modules.length === 0) {
    return []; // Return empty if no enrollment
  }
  
  const moduleList = modules.map(m => m.module);
  
  // Filter weeks by enrolled modules
  return await sql`
    SELECT
      week_id as course_id,
      title,
      description,
      order_num,
      created_at
    FROM weeks
    WHERE module = ANY(${moduleList})
    ORDER BY order_num;
  `;
}

// Modified getProjectsByWeek - Add access check
export async function getProjectsByWeek(week_id, user_id) {
  // Verify access first
  const access = await sql`
    SELECT w.* FROM weeks w
    JOIN enrollments e ON w.module = e.module
    WHERE w.week_id = ${week_id} 
      AND e.user_id = ${user_id} 
      AND e.status = 'active'
    LIMIT 1
  `;
  
  if (access.length === 0) {
    throw new Error('Access denied to this course');
  }
  
  // Then return projects
  return await sql`
    SELECT * FROM projects 
    WHERE week_id = ${week_id} 
    ORDER BY order_num;
  `;
}

// Modified getAllProjectQuizzes - Filter by enrollment
export async function getAllProjectQuizzes(user_id) {
  // Get enrolled modules
  const modules = await getUserEnrolledModules(user_id);
  
  return await sql`
    SELECT
      p.project_id,
      p.title AS project_title,
      q.quiz_id,
      q.title AS quiz_title,
      q.description,
      CASE 
        WHEN qs.submission_id IS NOT NULL THEN 'completed'
        ELSE 'not_attempted'
      END as status
    FROM projects p
    JOIN weeks w ON p.week_id = w.week_id
    LEFT JOIN quizzes q ON p.project_id = q.project_id
    LEFT JOIN quiz_submissions qs ON q.quiz_id = qs.quiz_id AND qs.user_id = ${user_id}
    WHERE w.module = ANY(${modules})  -- Filter by enrollment
    ORDER BY p.order_num, q.quiz_id
  `;
}
```

---

## 🌐 Frontend Implementation

### **Frontend Flow:**

```
Student visits /courses
   ↓
Frontend calls: GET /api/v1/student/dashboard/courses
   ↓
Backend returns only enrolled courses
   ↓
Frontend displays course cards for enrolled modules only
   ↓
Student clicks on course
   ↓
Frontend navigates to course content page
   ↓
Frontend calls: GET /api/v1/student/weeks/:week_id/projects
   ↓
Backend verifies access and returns projects
   ↓
If 403 error → Frontend shows "Access Denied" message
   ↓
If success → Display course structure
```

### **Error Handling:**

```javascript
// Frontend API call example
try {
  const response = await axios.get(`/api/v1/student/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  // Show quiz
} catch (error) {
  if (error.response?.status === 403) {
    // Show "You need to enroll in this course" message
    showEnrollmentMessage();
  }
}
```

---

## 🔐 Security Considerations

### **1. Always Verify on Backend**
- Never trust frontend data
- Always check enrollment on every request
- Use middleware to centralize access checks

### **2. JWT Token Contains User ID**
- Extract `user_id` from JWT token
- Never accept `user_id` from request body/params
- Prevents user from accessing other students' data

### **3. Database-Level Filtering**
- Use SQL JOINs to filter at database level
- Prevents loading all data then filtering in code
- More efficient and secure

### **4. WebSocket Security**
- Verify enrollment before allowing WebSocket connection
- Check access on every WebSocket event
- Disconnect unauthorized users immediately

---

## 📊 Access Control Matrix

| Resource | Check Required | Method |
|----------|---------------|--------|
| **Weeks/Courses** | User has enrollment matching `week.module` | JOIN enrollments |
| **Projects** | Project belongs to accessible week | JOIN weeks + enrollments |
| **Lessons** | Lesson belongs to accessible project | JOIN projects + weeks + enrollments |
| **Quizzes** | Quiz belongs to accessible project | JOIN projects + weeks + enrollments |
| **Assignments** | Assignment belongs to accessible project | JOIN projects + weeks + enrollments |
| **Resources** | Resource module matches enrollment OR is public | Filter by module |
| **Quiz Sessions** | Session belongs to accessible quiz | Verify quiz → project → week → module |

---

## 🔄 Complete Access Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              Student Registration Flow                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Student registers at /courses                       │
│     ↓                                                     │
│  2. Creates register entry with module                  │
│     ↓                                                     │
│  3. Student pays → payment_status = 'Paid'             │
│     ↓                                                     │
│  4. Admin confirms payment                              │
│     ↓                                                     │
│  5. System creates enrollment record:                   │
│     INSERT INTO enrollments (user_id, module, status)    │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Student Access Flow                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Student Login                                           │
│     ↓                                                     │
│  GET /api/v1/student/dashboard/courses                  │
│     ↓                                                     │
│  Backend:                                                │
│    1. Extract user_id from JWT                          │
│    2. Get enrolled modules                               │
│    3. Filter weeks WHERE module IN (enrolled_modules)   │
│    4. Return filtered courses                            │
│     ↓                                                     │
│  Frontend displays enrolled courses only                │
│                                                           │
│  Student clicks course                                  │
│     ↓                                                     │
│  GET /api/v1/student/weeks/:week_id/projects            │
│     ↓                                                     │
│  Backend:                                                │
│    1. Verify week.module matches enrollment             │
│    2. If no access → 403 Forbidden                      │
│    3. If access → Return projects                        │
│                                                           │
│  Student accesses quiz                                  │
│     ↓                                                     │
│  GET /api/v1/student/quizzes/:quiz_id                   │
│     ↓                                                     │
│  Backend:                                                │
│    1. Get quiz → project → week → module                │
│    2. Verify module matches enrollment                  │
│    3. Return quiz if authorized                          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

### **Key Principles:**

1. **Link Registration to User**: Connect `register` table to `users` via `user_id` or `enrollments` table

2. **Module-Based Course Structure**: Add `module` field to `weeks` table to categorize courses

3. **Filter at Database Level**: Use SQL JOINs to filter content based on enrolled modules

4. **Verify on Every Request**: Check enrollment access on all endpoints (weeks, projects, lessons, quizzes, assignments)

5. **WebSocket Verification**: Verify enrollment before allowing WebSocket connections for quiz sessions

6. **Frontend Error Handling**: Handle 403 errors gracefully and show enrollment messages

### **Result:**

✅ Students only see courses they registered for  
✅ Access is enforced at the backend level  
✅ Quizzes, assignments, and resources are filtered by enrollment  
✅ Real-time quiz sessions respect enrollment boundaries  
✅ Secure and scalable implementation  

---

**This theoretical approach ensures that students can only access content for courses they have registered and paid for!** 🎓


