# File Storage System Setup

This document describes the file storage system that stores files separately from their parent entities.

## Overview

The system uses separate tables for storing files, allowing multiple files per entity and better organization. The system maintains backward compatibility with old file storage methods.

## File Storage Tables

### 1. `assignment_files`
Stores files associated with assignments (question files).

**Schema:**
```sql
CREATE TABLE assignment_files (
  file_id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/assignment_file.model.js`

### 2. `assignment_submission_files`
Stores files submitted by students for assignments.

**Schema:**
```sql
CREATE TABLE assignment_submission_files (
  file_id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES assignment_submissions(submission_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/assignment_submission_file.model.js`

### 3. `lesson_files`
Stores files associated with lessons.

**Schema:**
```sql
CREATE TABLE lesson_files (
  file_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/lesson_file.model.js`

### 4. `quiz_question_files`
Stores files associated with quiz questions.

**Schema:**
```sql
CREATE TABLE quiz_question_files (
  file_id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(question_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/quiz_question_file.model.js`

### 5. `resource_files`
Stores files associated with resources.

**Schema:**
```sql
CREATE TABLE resource_files (
  file_id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resources(resource_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/resource_file.model.js`

### 6. `submission_answer_files`
Stores files associated with quiz submission answers.

**Schema:**
```sql
CREATE TABLE submission_answer_files (
  file_id SERIAL PRIMARY KEY,
  answer_id INTEGER NOT NULL REFERENCES submission_answers(answer_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by INTEGER REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/submission_answer_file.model.js`

### 7. `protoforial_files`
Stores files associated with protoforial entries.

**Schema:**
```sql
CREATE TABLE protoforial_files (
  file_id SERIAL PRIMARY KEY,
  proto_id INTEGER NOT NULL REFERENCES protoforial(proto_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Model:** `src/models/admin/protoforial_file.model.js`

## Setup Instructions

### 1. Run the Migration

Execute the migration script to create all file storage tables:

```bash
# Using psql
psql -U your_user -d your_database -f migrations/018_create_file_storage_tables.sql

# Or using the Node.js script
node scripts/verify_file_tables.js
```

### 2. Verify Tables

Run the verification script to ensure all tables are properly created:

```bash
node scripts/verify_file_tables.js
```

### 3. Backward Compatibility

The system maintains backward compatibility:
- Old assignments with `question_file_url` still work
- Old lessons with `file_url` still work
- Old resources with `file_url` still work
- The code checks both old columns and new file tables

## Usage Examples

### Adding Files to an Assignment

```javascript
import * as AssignmentFileModel from './models/admin/assignment_file.model.js';

const files = [
  { url: 'https://cloudinary.com/...', name: 'assignment.pdf', size: 1024 },
  { url: 'https://cloudinary.com/...', name: 'instructions.docx', size: 2048 }
];

const inserted = await AssignmentFileModel.addAssignmentFiles(assignmentId, files, userId);
```

### Retrieving Files for an Assignment

```javascript
const files = await AssignmentFileModel.getFilesByAssignment(assignmentId);
```

### Adding Files to a Lesson

```javascript
import * as LessonFileModel from './models/admin/lesson_file.model.js';

await LessonFileModel.addLessonFile({
  lesson_id: lessonId,
  file_url: 'https://cloudinary.com/...',
  file_name: 'lesson-video.mp4',
  file_type: 'video/mp4',
  file_size_bytes: 1024000,
  uploaded_by: userId
});
```

## Model Functions

All file models follow a similar pattern:

- `addXFiles(entity_id, files, uploaded_by)` - Add multiple files
- `addXFile({ entity_id, file_url, ... })` - Add single file
- `getFilesByXId(entity_id)` - Get all files for an entity
- `deleteFile(file_id)` - Delete a file

## Notes

- All file URLs should be Cloudinary URLs or absolute paths
- Files are automatically deleted when parent entity is deleted (CASCADE)
- Indexes are created on foreign key columns for performance
- The system supports multiple files per entity






