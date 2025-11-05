import * as AssignmentModel from '../../models/admin/assignment.model.js';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { saveFile, saveAssignmentFile } from '../../utils/saveFile.js';
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

    res.json({
      success: true,
      data: assignment
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

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Question file is required'
      });
    }

    // Upload to Cloudinary with proper settings
    let fileResult;
    try {
      fileResult = await saveAssignmentFile(req.file); // This now returns {secure_url, public_id, resource_type}
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'File upload to cloud failed: ' + uploadError.message
      });
    }

    const assignmentData = {
      ...req.body,
      question_file_url: fileResult,
      question_file_name: req.file.originalname,
      created_by: userId
    };

    const assignment = await AssignmentModel.createAssignment(assignmentData);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment
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
    const assignment = await AssignmentModel.updateAssignment(assignment_id, req.body);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
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
    const { assignment_id } = req.params;
    const assignment = await AssignmentModel.getAssignmentById(assignment_id);

    if (!assignment || !assignment.question_file_url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment file not found' 
      });
    }

    // Extract public ID and generate download URL
    const publicId = extractPublicId(assignment.question_file_url);
    const downloadUrl = generateDownloadUrl(publicId, 'raw', assignment.question_file_name);

    res.json({
      success: true,
      url: downloadUrl,
      fileName: assignment.question_file_name
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
      file: req.file
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

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Submission file is required'
      });
    }

    const submissionData = {
      answer_file_url: `assignment-submissions/${req.file.filename}`,
      answer_file_name: req.file.originalname
    };

    const submission = await AssignmentModel.updateSubmission(submission_id, submissionData);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update submission'
      });
    }

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error editing submission:', error);
    
    // Clean up uploaded file if update fails
    if (req.file) {
      const filePath = path.join(process.cwd(), 'uploads', 'assignment-submissions', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to edit submission: ' + error.message
    });
  }
};