import * as AssignmentModel from '../../models/admin/assignment.model.js';
import * as AssignmentFileModel from '../../models/admin/assignment_file.model.js';
import * as SubmissionFileModel from '../../models/admin/assignment_submission_file.model.js';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { saveFile, saveAssignmentFile, saveSubmissionFile } from '../../utils/saveFile.js';
import { extractPublicId, generateDownloadUrl } from '../../utils/downloadFile.js'; 

// Get all assignments
export const getAllAssignments = async (req, res) => {
  try {
    const assignments = await AssignmentModel.getAllAssignments();
    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
};

// JSON-only due date update (no file upload)
export const updateAssignmentDueDate = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    let { due_date } = req.body;

    if (!due_date) {
      return res.status(400).json({ success: false, message: 'due_date is required' });
    }

    // Normalize various inputs to a proper ISO string for DB casting
    // Supported relative formats: +30, +30m, +2h, +1d
    if (typeof due_date === 'string' && due_date.startsWith('+')) {
      const rel = due_date.trim().toLowerCase();
      const match = rel.match(/^\+(\d+)([mhd])?$/);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Invalid format. Use +<minutes>, +<num>m, +<num>h, or +<num>d' });
      }
      const amount = parseInt(match[1], 10);
      const unit = match[2] || 'm';
      const base = new Date();
      if (unit === 'm') base.setMinutes(base.getMinutes() + amount);
      else if (unit === 'h') base.setHours(base.getHours() + amount);
      else if (unit === 'd') base.setDate(base.getDate() + amount);
      due_date = base.toISOString();
    }

    // Support 'YYYY-MM-DD HH:MM:SS' by converting space to 'T'
    if (typeof due_date === 'string' && due_date.includes(' ') && !due_date.includes('T')) {
      due_date = due_date.replace(' ', 'T');
    }
    const parsed = new Date(due_date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid due_date' });
    }

    // Pass JS Date object for proper casting to timestamp without time zone
    const updateBody = { due_date: parsed };

    const assignment = await AssignmentModel.updateAssignment(assignment_id, updateBody);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, message: 'Due date updated', data: assignment });
  } catch (error) {
    console.error('Error updating due date:', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body
    });
    res.status(500).json({ success: false, message: 'Failed to update assignment', error: error.message });
  }
};

// Get assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await AssignmentModel.getAssignmentById(assignment_id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Attach files list
    const files = await AssignmentFileModel.getFilesByAssignment(assignment_id);

    res.json({
      success: true,
      data: { ...assignment, files }
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment'
    });
  }
};


// export const createAssignment = async (req, res) => {
//   try {
//     const userId = req.user.user_id;

//     // Check permission
//     const canCreate = await AssignmentModel.canCreateAssignment(userId);
//     if (!canCreate) {
//       return res.status(403).json({
//         success: false,
//         message: 'You do not have permission to create assignments'
//       });
//     }

//     // Check if file was uploaded
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: 'Question file is required'
//       });
//     }

//     // Upload to Cloudinary
//     let fileUrl;
//     try {
//       fileUrl = await saveAssignmentFile(req.file);
//     } catch (uploadError) {
//       console.error('Cloudinary upload failed:', uploadError);
//       return res.status(500).json({
//         success: false,
//         message: 'File upload to cloud failed: ' + uploadError.message
//       });
//     }

//     const assignmentData = {
//       ...req.body,
//       question_file_url: fileUrl,           // ← Cloudinary URL
//       question_file_name: req.file.originalname,
//       created_by: userId
//     };

//     const assignment = await AssignmentModel.createAssignment(assignmentData);

//     res.status(201).json({
//       success: true,
//       message: 'Assignment created successfully',
//       data: assignment
//     });

//   } catch (error) {
//     console.error('Error creating assignment:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create assignment'
//     });
//   }
// };

// Update assignment

export const createAssignment = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Check permission
    const canCreate = await AssignmentModel.canCreateAssignment(userId);
    if (!canCreate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create assignments'
      });
    }

    // Create assignment first (files are stored separately)
    const assignmentData = { ...req.body, created_by: userId };
    const assignment = await AssignmentModel.createAssignment(assignmentData);

    // If files were uploaded, upload to Cloudinary and persist in assignment_files
    let filesInserted = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      try {
        const uploaded = [];
        for (const f of req.files) {
          const url = await saveAssignmentFile(f);
          uploaded.push({ url, name: f.originalname, size: f.size });
        }
        filesInserted = await AssignmentFileModel.addAssignmentFiles(assignment.assignment_id, uploaded, userId);
      } catch (uploadError) {
        console.error('Cloudinary multi-upload failed:', uploadError);
        // Do not fail the whole creation if files fail; return with warning
      }
    }

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: { ...assignment, files: filesInserted }
    });

  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    });
  }
};
export const updateAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const updateBody = { ...req.body };

    const assignment = await AssignmentModel.updateAssignment(assignment_id, updateBody);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Handle file additions
    let addedFiles = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      try {
        const uploaded = [];
        for (const f of req.files) {
          const url = await saveAssignmentFile(f);
          uploaded.push({ url, name: f.originalname, size: f.size });
        }
        addedFiles = await AssignmentFileModel.addAssignmentFiles(assignment_id, uploaded, req.user.user_id);
      } catch (uploadErr) {
        console.error('Error uploading new assignment files:', uploadErr);
      }
    }

    // Handle file deletions
    if (updateBody.remove_file_ids) {
      try {
        const ids = Array.isArray(updateBody.remove_file_ids)
          ? updateBody.remove_file_ids
          : String(updateBody.remove_file_ids).split(',').map(s => s.trim()).filter(Boolean);
        for (const id of ids) {
          await AssignmentFileModel.deleteFile(id);
        }
      } catch (delErr) {
        console.error('Error deleting assignment files:', delErr);
      }
    }

    // Return assignment with current files
    const files = await AssignmentFileModel.getFilesByAssignment(assignment_id);

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: { ...assignment, files, addedFiles }
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment'
    });
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    await AssignmentModel.deleteAssignment(assignment_id);
    
    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment'
    });
  }
};

// Get assignment submissions
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const submissions = await AssignmentModel.getAssignmentSubmissions(assignment_id);
    
    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
};


// controllers/admin/assignment.controller.js
// export const downloadSubmissionFile = async (req, res) => {
//   try {
//     const { submission_id } = req.params;
//     const submission = await AssignmentModel.getSubmissionById(submission_id);

//     if (!submission || !submission.answer_file_url) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'File not found' 
//       });
//     }

//     // ✅ Just return the Cloudinary URL
//     res.json({
//       success: true,
//       url: submission.answer_file_url,
//       fileName: submission.answer_file_name
//     });

//   } catch (error) {
//     console.error('Download error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Failed to get download link' 
//     });
//   }
// };

export const downloadSubmissionFile = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const submission = await AssignmentModel.getSubmissionById(submission_id);

    if (!submission || !submission.answer_file_url) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Extract public ID from Cloudinary URL
    const publicId = extractPublicId(submission.answer_file_url);
    
    // Generate secure download URL with attachment flag
    const downloadUrl = generateDownloadUrl(publicId, 'raw', submission.answer_file_name);

    res.json({
      success: true,
      url: downloadUrl,
      fileName: submission.answer_file_name,
      originalUrl: submission.answer_file_url // Fallback
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get download link: ' + error.message 
    });
  }
};

export const downloadAssignmentFile = async (req, res) => {
  try {
    // Deprecated after multi-file change
    return res.status(410).json({
      success: false,
      message: 'Deprecated endpoint. Use files list on the assignment and download by file_id.'
    });

  } catch (error) {
    console.error('Assignment download error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get assignment download link' 
    });
  }
};

// Grade submission - FIX THIS FUNCTION
export const gradeSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { grade, feedback } = req.body;
    const gradedBy = req.user.user_id;

    console.log('Grading submission request:', {
      submission_id,
      grade,
      feedback,
      gradedBy,
      body: req.body,
      user: req.user
    });

    // Check if submission exists first
    const existingSubmission = await AssignmentModel.getSubmissionById(submission_id);
    if (!existingSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Validate grade
    if (grade === null || grade === undefined || grade === '') {
      return res.status(400).json({
        success: false,
        message: 'Grade is required'
      });
    }

    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade)) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be a valid number'
      });
    }

    if (numericGrade < 0 || numericGrade > 100) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be between 0 and 100'
      });
    }

    const gradeData = {
      grade: numericGrade,
      feedback: feedback || '',
      graded_by: gradedBy
    };

    console.log('Calling gradeSubmission with:', gradeData);

    const submission = await AssignmentModel.gradeSubmission(submission_id, gradeData);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update submission'
      });
    }

    console.log('Grading successful:', submission);

    res.json({
      success: true,
      message: 'Submission graded successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission: ' + error.message
    });
  }
};


//edit submission

// Edit submission
export const editSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const userId = req.user.user_id;

    console.log('Edit submission request:', {
      submission_id,
      userId,
      file: req.file,
      filesCount: Array.isArray(req.files) ? req.files.length : (req.file ? 1 : 0)
    });

    // Check if submission exists and belongs to user
    const existingSubmission = await AssignmentModel.getSubmissionById(submission_id);
    if (!existingSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns the submission (unless admin/teacher)
    const isAdminOrTeacher = await AssignmentModel.canCreateAssignment(userId);
    if (existingSubmission.user_id !== userId && !isAdminOrTeacher) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own submissions'
      });
    }

    // Add newly uploaded files (support multiple)
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    let addedFiles = [];
    if (files.length === 0 && !req.body.remove_file_ids) {
      return res.status(400).json({ success: false, message: 'No changes provided. Upload files or specify remove_file_ids.' });
    }

    if (files.length > 0) {
      const uploaded = [];
      for (const f of files) {
        const url = await saveSubmissionFile(f);
        uploaded.push({ url, name: f.originalname, size: f.size });
      }
      addedFiles = await SubmissionFileModel.addSubmissionFiles(submission_id, uploaded, userId);
    }

    // Handle file removals
    if (req.body.remove_file_ids) {
      const ids = Array.isArray(req.body.remove_file_ids)
        ? req.body.remove_file_ids
        : String(req.body.remove_file_ids).split(',').map(s => s.trim()).filter(Boolean);
      for (const id of ids) {
        await SubmissionFileModel.deleteFile(Number(id));
      }
    }

    // Return submission with current files
    const filesNow = await SubmissionFileModel.getFilesBySubmission(submission_id);
    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: { ...existingSubmission, files: filesNow, addedFiles }
    });
  } catch (error) {
    console.error('Error editing submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit submission: ' + error.message
    });
  }
};