# 📚 Module Management & Enrollment System - Complete Guide

## 🎯 Overview

This system ensures that students only see course content (weeks, projects, lessons, quizzes, assignments, resources) for modules they are enrolled in.

---

## 🔄 Complete Workflow

### **1. Student Registration Flow**

```
Student → Register Course → Select Module → Payment Pending
                                              ↓
                                    Admin Confirms Payment → Enrollment Created Automatically
                                              ↓
                                    Student Sees Content in Dashboard
```

**Steps:**
1. Student visits `/courses` and selects a course module
2. Student fills registration form with module selection
3. Registration saved with `payment_status = 'Pending'`
4. Admin updates payment status to `'Paid'`
5. **System automatically creates enrollment** in `enrollments` table
6. Student can now see content for that module in dashboard

---

### **2. Admin Module Assignment Flow**

```
Admin → Create/Edit Week → Assign Module → Save
                                    ↓
                    Week Linked to Module
                                    ↓
          Students Enrolled in That Module → See Week in Dashboard
```

**Steps:**
1. Admin goes to **Admin Dashboard → Weeks**
2. Admin creates new week or edits existing week
3. Admin **MUST select a module** from dropdown:
   - Plumbing & Mechanical Design (HVAC)
   - MEP Design
   - Electrical Design
   - Electrical & Plumbing Basics
4. Admin saves week
5. Week is now linked to that module
6. **Only students enrolled in that module will see this week**

---

## 📍 Where to Set Modules

### **For Admins:**

#### **1. Weeks Management** ✅
- **Location:** Admin Dashboard → Weeks
- **Action:** When creating/editing a week, use the **"Course Module"** dropdown
- **Required:** YES - Module must be selected
- **Result:** Week will only appear to students enrolled in that module

#### **2. Resources Management** (Optional)
- **Location:** Admin Dashboard → Resources
- **Action:** Set `module` field when creating/editing resources
- **Note:** Can also set `is_public = true` to make resources visible to all students

---

## 👥 Viewing Registered Users

### **Admin Dashboard → Registrations** ✅

**What you can see:**
- ✅ All registered users
- ✅ Their selected module
- ✅ Payment status (Pending/Paid/Failed)
- ✅ **Enrollment status** (Enrolled & Active / Enrollment Pending / Not Enrolled)
- ✅ Enrollment date (if enrolled)

**Columns:**
1. **Name** - Student's full name
2. **Email** - Student's email address
3. **Contact** - Phone number
4. **Module** - Selected course module
5. **Payment Status** - Badge showing payment state
6. **Enrollment Status** - Badge showing enrollment state:
   - 🟢 **Enrolled & Active** - Student has access to course content
   - 🟠 **Enrollment Pending** - Payment confirmed but enrollment not yet created
   - ⚪ **Not Enrolled** - Payment not confirmed
7. **Payment Method** - How they paid
8. **Date** - Registration date
9. **Actions** - Delete registration

---

## 🔐 Access Control Rules

### **For Students:**

Students will **ONLY** see content if:
- ✅ They are registered with a module
- ✅ Payment status is `'Paid'`
- ✅ An enrollment record exists in `enrollments` table with `status = 'active'`
- ✅ The content (week/project/quiz/resource) is assigned to their enrolled module

### **For Admins:**

Admins see **ALL** content regardless of module assignment.

---

## 📊 Database Structure

### **Enrollments Table**
```sql
enrollments (
  enrollment_id (PK)
  user_id (FK → users)
  registration_id (FK → register)
  module (VARCHAR) -- e.g., "Plumbing & Mechanical Design (HVAC)"
  status (active/completed/cancelled/expired)
  enrolled_at
)
```

### **Weeks Table**
```sql
weeks (
  week_id (PK)
  title
  description
  order_num
  module (VARCHAR) -- Links week to a module
)
```

### **Register Table**
```sql
register (
  id (PK)
  full_name
  email_address
  module (VARCHAR) -- Module selected during registration
  payment_status
  user_id (FK → users) -- Links to user account
)
```

---

## 🛠️ How It Works Technically

### **1. Enrollment Creation (Automatic)**
When admin updates payment status to `'Paid'`:
```javascript
// Backend: register.controller.js → updatePaymentStatus()
if (payment_status === 'Paid' && module) {
  // 1. Find or create user account
  // 2. Create enrollment record
  await createEnrollment({
    user_id,
    registration_id,
    module,
    status: 'active'
  });
}
```

### **2. Content Filtering (Automatic)**
When student requests content:
```javascript
// Backend: student.model.js
// 1. Get user's enrolled modules
const modules = await getUserEnrolledModules(user_id);

// 2. Filter content by module
SELECT * FROM weeks WHERE module = ANY(${modules})
```

---

## ✅ Checklist for Admin

### **Setting Up Weeks:**
- [ ] Go to Admin Dashboard → Weeks
- [ ] Click "Add Week"
- [ ] Fill in title, description, order number
- [ ] **Select a module from dropdown** ← REQUIRED
- [ ] Save week
- [ ] Verify module badge appears in weeks list

### **Managing Registrations:**
- [ ] Go to Admin Dashboard → Registrations
- [ ] View all registered users
- [ ] Check module selected by each student
- [ ] Update payment status to `'Paid'` for confirmed payments
- [ ] Verify enrollment is created automatically (check "Enrollment Status" column)
- [ ] Student should now see content in their dashboard

### **Verifying Access:**
- [ ] Login as student
- [ ] Go to Dashboard
- [ ] Check Course Content page
- [ ] Should only see weeks/projects for enrolled module
- [ ] Other modules should not be visible

---

## 🎓 Example Scenario

**Student Registration:**
- Student "John Doe" registers for "MEP Design" module
- Payment status: Pending

**Admin Actions:**
1. Admin sees registration in "Registrations" page
2. Admin confirms payment → Updates status to "Paid"
3. System automatically creates enrollment

**Week Assignment:**
1. Admin creates Week 1: "Introduction to MEP Systems"
2. Admin selects module: "MEP Design"
3. Week is saved

**Result:**
- ✅ John Doe (enrolled in MEP Design) → Sees Week 1 in dashboard
- ❌ Jane Doe (enrolled in Electrical Design) → Does NOT see Week 1

---

## 🚨 Important Notes

1. **Module Selection is REQUIRED** when creating weeks
2. **Enrollment is created automatically** when payment is confirmed
3. **Content is filtered automatically** - no manual access management needed
4. **Public resources** can be made visible to all by setting `is_public = true`
5. **Existing weeks** without modules won't appear to students (assign a module to fix)

---

## 🔧 Troubleshooting

**Problem:** Student doesn't see weeks/projects
- ✅ Check: Is student enrolled? (Registration → Enrollment Status)
- ✅ Check: Is week assigned to correct module? (Weeks → Module column)
- ✅ Check: Do modules match? (Registration module = Week module)

**Problem:** Enrollment not created after payment
- ✅ Check: Does registration have a `module` field?
- ✅ Check: Does user exist in `users` table?
- ✅ Check: Backend logs for errors

**Problem:** Week shows "Not Assigned" module
- ✅ Solution: Edit the week and assign a module
- ✅ Note: Students won't see weeks without assigned modules

---

## 📝 Summary

1. **Students register** with a module selection
2. **Admin confirms payment** → Enrollment created automatically
3. **Admin assigns modules** to weeks when creating/editing
4. **Students see only** content for their enrolled modules
5. **Admin sees all** registrations and enrollment statuses

**Everything is automated!** Just ensure:
- ✅ Weeks have modules assigned
- ✅ Payments are confirmed
- ✅ Students are enrolled (automatic)

---

**Last Updated:** Module Management System v1.0
**Status:** ✅ Production Ready


