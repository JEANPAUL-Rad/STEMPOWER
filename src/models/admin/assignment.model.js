
import sql, { createDBTimestamp, parseDBTimestamp } from '../../config/db.js';

// Create new assignment
export const createAssignment = async (assignmentData) => {
  try {
    const {
      project_id,
      lesson_id,
      module,
      title,
      description,
      max_file_size_mb,
      allowed_file_types,
      due_date,
      created_by
    } = assignmentData;

    const result = await sql`
      INSERT INTO assignments (
        project_id, lesson_id, module, title, description,
        max_file_size_mb, allowed_file_types,
        due_date, created_by, created_at, updated_at
      ) VALUES (
        ${project_id}, ${lesson_id}, ${module}, ${title}, ${description},
        ${max_file_size_mb}, ${allowed_file_types}, ${due_date}, ${created_by},
        ${createDBTimestamp()}, ${createDBTimestamp()}
      ) RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

// Get all assignments
export const getAllAssignments = async () => {
  try {
    const result = await sql`
      SELECT 
        a.*,
        p.title as project_title,
        l.title as lesson_title,
        u.name as created_by_name,
        COUNT(DISTINCT as_sub.user_id) as submission_count,
        COUNT(DISTINCT ad.user_id) as download_count
      FROM assignments a
      LEFT JOIN projects p ON a.project_id = p.project_id
      LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
      LEFT JOIN users u ON a.created_by = u.user_id
      LEFT JOIN assignment_submissions as_sub ON a.assignment_id = as_sub.assignment_id
      LEFT JOIN assignment_downloads ad ON a.assignment_id = ad.assignment_id
      WHERE a.is_active = true
      GROUP BY a.assignment_id, p.title, l.title, u.name
      ORDER BY a.created_at DESC
    `;

    return result.map(assignment => ({
      ...assignment,
      due_date_cat: parseDBTimestamp(assignment.due_date),
      created_at_cat: parseDBTimestamp(assignment.created_at)
    }));
  } catch (error) {
    console.error('Error getting assignments:', error);
    throw error;
  }
};

// Get assignment by ID
export const getAssignmentById = async (assignmentId) => {
  try {
    const result = await sql`
      SELECT 
        a.*,
        p.title as project_title,
        l.title as lesson_title,
        u.name as created_by_name
      FROM assignments a
      LEFT JOIN projects p ON a.project_id = p.project_id
      LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
      LEFT JOIN users u ON a.created_by = u.user_id
      WHERE a.assignment_id = ${assignmentId}
    `;

    if (result.length === 0) return null;

    return {
      ...result[0],
      due_date_cat: parseDBTimestamp(result[0].due_date),
      created_at_cat: parseDBTimestamp(result[0].created_at)
    };
  } catch (error) {
    console.error('Error getting assignment by ID:', error);
    throw error;
  }
};

// Get assignments by project
export const getAssignmentsByProject = async (projectId) => {
  try {
    const result = await sql`
      SELECT 
        a.*,
        l.title as lesson_title,
        u.name as created_by_name,
        COUNT(DISTINCT as_sub.user_id) as submission_count
      FROM assignments a
      LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
      LEFT JOIN users u ON a.created_by = u.user_id
      LEFT JOIN assignment_submissions as_sub ON a.assignment_id = as_sub.assignment_id
      WHERE a.project_id = ${projectId} AND a.is_active = true
      GROUP BY a.assignment_id, l.title, u.name
      ORDER BY a.created_at DESC
    `;

    return result.map(assignment => ({
      ...assignment,
      due_date_cat: parseDBTimestamp(assignment.due_date),
      created_at_cat: parseDBTimestamp(assignment.created_at)
    }));
  } catch (error) {
    console.error('Error getting assignments by project:', error);
    throw error;
  }
};

// Update assignment
export const updateAssignment = async (assignmentId, updateData) => {
  try {
    const {
      title = null,
      description = null,
      module = null,
      max_file_size_mb = null,
      allowed_file_types = null,
      due_date = null,
      is_active = null,
      
    } = updateData || {};

    const result = await sql`
      UPDATE assignments SET
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        module = COALESCE(${module}, module),
        max_file_size_mb = COALESCE(${max_file_size_mb}, max_file_size_mb),
        allowed_file_types = COALESCE(${allowed_file_types}, allowed_file_types),
        due_date = COALESCE(${due_date}, due_date),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = ${createDBTimestamp()}
      WHERE assignment_id = ${assignmentId}
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

// Delete assignment
export const deleteAssignment = async (assignmentId) => {
  try {
    await sql`
      UPDATE assignments SET 
        is_active = false,
        updated_at = ${createDBTimestamp()}
      WHERE assignment_id = ${assignmentId}
    `;
    return true;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};

// Check if user can create assignment
export const canCreateAssignment = async (userId) => {
  try {
    const result = await sql`
      SELECT 1 FROM users 
      WHERE user_id = ${userId} 
      AND role IN ('admin', 'teacher')
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error checking assignment creation permission:', error);
    return false;
  }
};

// Record assignment download
export const recordDownload = async (assignmentId, userId) => {
  try {
    await sql`
      INSERT INTO assignment_downloads (assignment_id, user_id, downloaded_at)
      VALUES (${assignmentId}, ${userId}, ${createDBTimestamp()})
    `;
    return true;
  } catch (error) {
    console.error('Error recording download:', error);
    throw error;
  }
};

// Get assignment submissions
export const getAssignmentSubmissions = async (assignmentId) => {
  try {
    const result = await sql`
      SELECT 
        sub.*,
        u.name as student_name,
        u.email as student_email,
        grader.name as graded_by_name
      FROM assignment_submissions sub
      JOIN users u ON sub.user_id = u.user_id
      LEFT JOIN users grader ON sub.graded_by = grader.user_id
      WHERE sub.assignment_id = ${assignmentId}
      ORDER BY sub.submitted_at DESC
    `;

    return result.map(submission => ({
      ...submission,
      submitted_at_cat: parseDBTimestamp(submission.submitted_at),
      graded_at_cat: parseDBTimestamp(submission.graded_at)
    }));
  } catch (error) {
    console.error('Error getting assignment submissions:', error);
    throw error;
  }
};

// Add these functions to your existing assignment.model.js

// Get submission by ID
export const getSubmissionById = async (submissionId) => {
  try {
    const result = await sql`
      SELECT 
        sub.*,
        u.name as student_name,
        u.email as student_email,
        a.title as assignment_title
      FROM assignment_submissions sub
      JOIN users u ON sub.user_id = u.user_id
      JOIN assignments a ON sub.assignment_id = a.assignment_id
      WHERE sub.submission_id = ${submissionId}
    `;

    if (result.length === 0) return null;

    return {
      ...result[0],
      submitted_at_cat: parseDBTimestamp(result[0].submitted_at),
      graded_at_cat: parseDBTimestamp(result[0].graded_at)
    };
  } catch (error) {
    console.error('Error getting submission by ID:', error);
    throw error;
  }
};

// Grade submission
export const gradeSubmission = async (submissionId, gradeData) => {
  try {
    const { grade, feedback, graded_by } = gradeData;

    console.log('Model gradeSubmission called with:', { submissionId, gradeData });

    // First check if submission exists
    const existingSubmission = await sql`
      SELECT * FROM assignment_submissions 
      WHERE submission_id = ${submissionId}
    `;

    if (existingSubmission.length === 0) {
      console.error('Submission not found:', submissionId);
      return null;
    }

    console.log('Found submission:', existingSubmission[0]);

   const result = await sql`
  UPDATE assignment_submissions SET
    grade = ${grade},
    feedback = ${feedback},
    graded_by = ${graded_by},
    graded_at = ${createDBTimestamp()},
    status = 'graded'
  WHERE submission_id = ${submissionId}
  RETURNING *
`;
    if (result.length === 0) {
      return null;
    }
    return result[0];
  } catch (error) {
    console.error('Model Error grading submission:', error); // Already present
    throw error;
  }
};


// Update submission
export const updateSubmission = async (submissionId, updateData) => {
  try {
    const { answer_file_url, answer_file_name } = updateData;

    const result = await sql`
      UPDATE assignment_submissions SET
        answer_file_url = COALESCE(${answer_file_url}, answer_file_url),
        answer_file_name = COALESCE(${answer_file_name}, answer_file_name),
        submitted_at = ${createDBTimestamp()},
        status = 'submitted',
        grade = NULL,
        feedback = NULL,
        graded_by = NULL,
        graded_at = NULL
      WHERE submission_id = ${submissionId}
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error('Error updating submission:', error);
    throw error;
  }
};