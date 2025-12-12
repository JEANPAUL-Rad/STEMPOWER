import * as AssignmentModel from '../models/admin/assignment.model.js';
import * as AssignmentFileModel from '../models/admin/assignment_file.model.js';
import * as Student from '../models/student.model.js';
import { hasAccessToModule } from '../utils/enrollment.js';
import { streamOrRedirect } from '../utils/fileDelivery.js';
import { saveFile, saveSubmissionFile } from '../utils/saveFile.js';

const resolveUploadedFileFromRequest = (req) => {
  if (req.file) return req.file;
  if (Array.isArray(req.files) && req.files.length > 0) return req.files[0];
  if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      const value = req.files[key];
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }
    }
  }
  return null;
};

// 1. Weeks & Projects
export async function getWeeks(req, res) {
    try {
        const data = await Student.getWeeks(req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getWeeks controller:', error);
        res.status(500).json({ message: 'Error fetching weeks', error: error.message });
    }
}

// Direct download/redirect for assignment question file
export async function downloadAssignmentFile(req, res) {
  try {
    const assignmentId = parseInt(req.params.assignment_id, 10);
    const userId = req.user.user_id;
    const fileId = req.query.file_id ? parseInt(req.query.file_id, 10) : null;
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    const assignment = await Student.getAssignmentById(assignmentId, userId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    let fileUrl = assignment.question_file_url;
    let fileName = assignment.question_file_name;

    // Check assignment_files table (new multi-file system)
    if (!fileUrl || (fileId && assignment.files)) {
      const files = assignment.files || await AssignmentFileModel.getFilesByAssignment(assignmentId);
      if (!files || files.length === 0) {
        // If no files in new system and no question_file_url, return error
        if (!fileUrl) {
          return res.status(404).json({ message: 'Assignment file not found' });
        }
      } else {
        const selected = fileId ? files.find((f) => f.file_id === fileId) : files[0];
        if (selected) {
          fileUrl = selected.file_url;
          fileName = selected.file_name;
        } else if (fileId) {
          return res.status(404).json({ message: 'Assignment file not found for this ID' });
        }
      }
    }

    if (!fileUrl) {
      return res.status(404).json({ message: 'Assignment file not found' });
    }

    return streamOrRedirect(
      res,
      fileUrl,
      fileName || `assignment-${assignmentId}`,
      'Assignment file not found on server.'
    );
  } catch (error) {
    console.error('Error in downloadAssignmentFile:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error downloading assignment file', error: error.message });
    }
  }
}

export async function getProjectsByWeek(req, res) {
    try {
        const data = await Student.getProjectsByWeek(req.params.week_id, req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getProjectsByWeek controller:', error);
        if (error.message.includes('access') || error.message.includes('enrollment')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching projects by week', error: error.message });
    }
}

// 2. Projects & Lessons
export async function getProjectDetails(req, res) {
    try {
        const result = await Student.getProjectDetails(req.params.project_id, req.user.user_id);
        if (!result) return res.status(404).json({ message: 'Project not found' });
        res.json(result);
    } catch (error) {
        console.error('Error in getProjectDetails controller:', error);
        if (error.message.includes('access') || error.message.includes('enrollment')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching project details', error: error.message });
    }
}

export async function getAllProjects(req, res) {
    try {
        const data = await Student.getAllProjects(req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getAllProjects controller:', error);
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
}

export async function getLessonsByProject(req, res) {
    try {
        const data = await Student.getLessonsByProject(req.params.project_id, req.user?.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getLessonsByProject controller:', error);
        if (error.message && error.message.includes('access')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching lessons by project', error: error.message });
    }
}

export async function getLessonDetails(req, res) {
    try {
        // First get lesson to find its project
        const lesson = await Student.getLessonDetails(req.params.lesson_id);
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
        
        // Verify user has access to the project this lesson belongs to
        const project = await Student.getProjectDetails(lesson.project_id, req.user.user_id);
        if (!project) {
            return res.status(403).json({ message: 'You do not have access to this lesson' });
        }
        
        res.json(lesson);
    } catch (error) {
        console.error('Error in getLessonDetails controller:', error);
        if (error.message.includes('access') || error.message.includes('enrollment')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching lesson details', error: error.message });
    }
}

export async function getQuizHistory(req, res) {
    try {
        const userId = req.user.user_id;
        const history = await Student.getQuizHistory(userId);
        res.json({
            success: true,
            history
        });
    } catch (err) {
        console.error('Controller Error - getQuizHistory:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to load quiz history',
            error: err.message || 'Unknown error'
        });
    }
}

export async function markLessonComplete(req, res) {
    try {
        await Student.markLessonComplete(req.user.user_id, req.params.lesson_id);
        res.json({ message: 'Lesson marked as complete' });
    } catch (error) {
        console.error('Error in markLessonComplete controller:', error);
        if (error.message && (error.message.includes('access') || error.message.includes('enrollment'))) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error marking lesson as complete', error: error.message });
    }
}

// 3. Quizzes


export async function getQuizDetails(req, res) {
    const quizId = parseInt(req.params.quiz_id, 10);
    const userId = req.user.user_id; // Get user ID from authenticated user
    
    if (isNaN(quizId)) {
        return res.status(400).json({ message: 'Quiz ID must be an integer' });
    }
    
    try {
        const quiz = await Student.getQuizDetails(quizId, userId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        console.error('Error in getQuizDetails controller:', error);
        if (error.message.includes('access') || error.message.includes('enrollment')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching quiz details', error: error.message });
    }
}

/// UPDATE the existing submitQuiz function to handle duplicate submissions:
// export async function submitQuiz(req, res) {
//     try {
//         const { quiz_id } = req.params;
//         const userId = req.user.user_id;
//         let { answers } = req.body;

//         console.log('\n=== SUBMISSION START ===');
//         console.log('Quiz ID:', quiz_id);
//         console.log('User ID:', userId);
//         console.log('Parsed answers:', answers);

//         // Check if already submitted
//         const alreadySubmitted = await Student.checkQuizSubmissionExists(parseInt(quiz_id), userId);
//         if (alreadySubmitted) {
//             return res.status(409).json({
//                 message: 'Quiz has already been submitted and cannot be resubmitted'
//             });
//         }

//         if (!Array.isArray(answers) || answers.length === 0) {
//             return res.status(400).json({ message: 'No answers provided' });
//         }

//         const processedAnswers = [];

//         for (const answer of answers) {
//             const processedAnswer = {
//                 question_id: parseInt(answer.question_id),
//                 selected_choice_id: answer.selected_choice_id ? parseInt(answer.selected_choice_id) : null,
//                 text_answer: answer.text_answer || null,
//                 file_url: null
//             };

//             // ✅ Handle file upload if present
//             if (answer.has_file === true) {
//                 if (answer.file) {
//                     try {
//                         // Assuming saveFile returns the final file path (e.g. 'uploads/Jeanluc.docx')
//                         const savedPath = await saveFile(answer.file);
//                         processedAnswer.file_url = savedPath;
//                         console.log(`✅ File saved for Q${answer.question_id}: ${savedPath}`);
//                     } catch (fileError) {
//                         console.error(`❌ File save failed for Q${answer.question_id}:`, fileError);
//                         return res.status(500).json({
//                             message: `Failed to save file for question ${answer.question_id}`,
//                             error: fileError.message
//                         });
//                     }
//                 } else {
//                     console.warn(`⚠️ has_file=true but no file provided for Q${answer.question_id}`);
//                 }
//             }

//             processedAnswers.push(processedAnswer);
//         }

//         // 💾 Save submission + all answers in DB
//         const result = await Student.submitQuiz(parseInt(quiz_id), userId, processedAnswers);

//         return res.status(201).json({
//             message: 'Quiz submitted successfully',
//             submission_id: result.submission_id
//         });

//     } catch (error) {
//         console.error('❌ Submission Error:', error);
        
//         if (error.message === 'Quiz has already been submitted by this user') {
//             return res.status(409).json({
//                 message: 'Quiz has already been submitted and cannot be resubmitted'
//             });
//         }
        
//         return res.status(500).json({
//             message: 'Failed to submit quiz',
//             error: error.message
//         });
//     }
// }

export async function submitQuiz(req, res) {
    try {
        const { quiz_id } = req.params;
        const userId = req.user.user_id;
        let { answers } = req.body;

        // Check if already submitted
        const alreadySubmitted = await Student.checkQuizSubmissionExists(parseInt(quiz_id), userId);
        if (alreadySubmitted) {
            return res.status(409).json({ 
                message: 'Quiz has already been submitted and cannot be resubmitted' 
            });
        }

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ message: 'No answers provided' });
        }

        const processedAnswers = [];

        for (const answer of answers) {
            const processedAnswer = {
                question_id: parseInt(answer.question_id),
                selected_choice_id: answer.selected_choice_id ? parseInt(answer.selected_choice_id) : null,
                text_answer: answer.text_answer || null,
                file_url: null
            };

            // ✅ Handle file upload if present
            if (answer.has_file === true && answer.file) {
                try {
                    // Now returns Cloudinary URL
                    const fileUrl = await saveFile(answer.file);
                    processedAnswer.file_url = fileUrl; // ← Cloudinary URL
                    console.log(`✅ File uploaded to Cloudinary for Q${answer.question_id}: ${fileUrl}`);
                } catch (fileError) {
                    console.error(`❌ File upload failed for Q${answer.question_id}:`, fileError);
                    return res.status(500).json({
                        message: `Failed to upload file for question ${answer.question_id}`,
                        error: fileError.message
                    });
                }
            }

            processedAnswers.push(processedAnswer);
        }

        // 💾 Save submission + all answers in DB
        const result = await Student.submitQuiz(parseInt(quiz_id), userId, processedAnswers);

        return res.status(201).json({
            message: 'Quiz submitted successfully',
            submission_id: result.submission_id
        });

    } catch (error) {
        console.error('❌ Submission Error:', error);
        
        if (error.message === 'Quiz has already been submitted by this user') {
            return res.status(409).json({
                message: 'Quiz has already been submitted and cannot be resubmitted'
            });
        }
        
        return res.status(500).json({
            message: 'Failed to submit quiz',
            error: error.message
        });
    }
}

export async function updateQuizSubmissionGrade(req, res) {
    try {
        const { submission_id } = req.params;
        const { overall_score, status, answersFeedback } = req.body;

        if (!submission_id) {
            return res.status(400).json({ message: 'Submission ID is required' });
        }

        if (overall_score === undefined && status === undefined && !answersFeedback) {
            return res.status(400).json({ message: 'No grade data provided for update.' });
        }

        await Student.updateQuizSubmissionGrade(submission_id, overall_score, status, answersFeedback);
        res.json({ message: 'Quiz submission grade updated successfully' });
    } catch (error) {
        console.error('Error in updateQuizSubmissionGrade controller:', error);
        res.status(500).json({ message: 'Error updating quiz submission grade', error: error.message });
    }
}

// export async function getAllProjectQuizzes(req, res) {
//     try {
//         const data = await Student.getAllProjectQuizzes();
//         res.json(data);
//     } catch (err) {
//         console.error('Error fetching quizzes by project:', err);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// }


// 4. Progress
export async function getAllProjectQuizzes(req, res) {
    try {
        const userId = req.user.user_id; // Get user ID from authenticated user
        const data = await Student.getAllProjectQuizzes(userId);
        res.json(data);
    } catch (err) {
        console.error('Error fetching quizzes by project:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export async function getProgress(req, res) {
    try {
        const data = await Student.getProgress(req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getProgress controller:', error);
        res.status(500).json({ message: 'Error fetching progress', error: error.message });
    }
}

// 5. Resources
export async function getResources(req, res) {
    try {
        const { type } = req.query;
        const data = await Student.getResources(type, req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getResources controller:', error);
        res.status(500).json({ message: 'Error fetching resources', error: error.message });
    }
}

// --- ADDED THIS NEW FUNCTION FOR RESOURCE DETAILS ---
export async function getResourceDetails(req, res) {
    try {
        const resourceId = parseInt(req.params.resource_id, 10); // Ensure ID is an integer
        if (isNaN(resourceId)) {
            return res.status(400).json({ message: 'Resource ID must be a valid number.' });
        }

        const resource = await Student.getResourceDetails(resourceId);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        
        // Check if resource is public or user has access to its module
        if (!resource.is_public && resource.module) {
            const hasAccess = await hasAccessToModule(req.user.user_id, resource.module);
            if (!hasAccess) {
                return res.status(403).json({ message: 'You do not have access to this resource' });
            }
        }
        
        res.json(resource);
    } catch (error) {
        console.error('Error in getResourceDetails controller:', error);
        res.status(500).json({ message: 'Error fetching resource details', error: error.message });
    }
}
// ----------------------------------------------------

// 6. Dashboard Controllers
export async function getCourses(req, res) {
    try {
        const data = await Student.getCourses(req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getCourses controller:', error);
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
}

export async function getProjectsByWeekDashboard(req, res) {
    try {
        const data = await Student.getProjectsByWeekDashboard(req.user.user_id);
        res.json(data);
    } catch (error) {
        console.error('Error in getProjectsByWeekDashboard controller:', error);
        res.status(500).json({ message: 'Error fetching projects by week for dashboard', error: error.message });
    }
}

export async function getRecentActivity(req, res) {
    try {
        const userId = req.user.user_id;
        const page = parseInt(req.query.page || '1', 10); // Get page from query, default to 1
        const limit = parseInt(req.query.limit || '10', 10); // Get limit from query, default to 10

        const data = await Student.getRecentActivity(userId, page, limit); // Pass page and limit
        res.json(data); // Send back paginated data
    } catch (error) {
        console.error('Error in getRecentActivity controller:', error);
        res.status(500).json({ message: 'Error fetching recent activity', error: error.message });
    }
}

export async function getMyDashboard(req, res) {
    try {
        const user_id = req.user.user_id;
        const user_name = req.user.name || 'Student';
        const user_role = req.user.role || 'student';

        const dashboardData = await Student.getMyDashboard(user_id);

        const responseData = {
            ...dashboardData,
            stats: {
                ...dashboardData.stats,
                user_name,
                role: user_role
            },
            enrolled_modules: dashboardData.enrolled_modules || []
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error in getMyDashboard controller:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error fetching dashboard data', 
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
        });
    }
}

// Get ALL Module Content for User
export async function getAllModuleContent(req, res) {
    try {
        const user_id = req.user.user_id;
        const result = await Student.getAllModuleContent(user_id);
        res.json(result);
    } catch (error) {
        console.error('Error in getAllModuleContent controller:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error fetching module content',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
            data: {
                weeks: [],
                projects: [],
                lessons: [],
                quizzes: [],
                assignments: [],
                resources: [],
                module: null
            }
        });
    }
}

// Content Integrity Diagnostics
export async function getModuleContentIntegrity(req, res) {
    try {
        const user_id = req.user.user_id;
        const result = await Student.getModuleContentIntegrity(user_id);
        res.json(result);
    } catch (error) {
        console.error('Error in getModuleContentIntegrity controller:', error);
        res.status(500).json({
            success: false,
            message: 'Error running integrity diagnostics',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
            data: {
                module: null,
                module_title: null,
                checks: {
                    weeks_without_module: [],
                    projects_without_week: [],
                    lessons_without_project: [],
                    lessons_mismatched_module: [],
                    resources_non_public_mismatched_module: []
                },
                counts: {
                    weeks_for_module: 0,
                    projects_for_module: 0,
                    lessons_for_module: 0,
                    resources_public: 0,
                    resources_module_specific: 0
                }
            }
        });
    }
}

// 7. User Details
export async function getUserDetails(req, res) {
    try {
        const user_id = req.user.user_id;
        const userDetails = await Student.getUserDetails(user_id);
        if (!userDetails) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(userDetails);
    } catch (error) {
        console.error('Error in getUserDetails controller:', error);
        res.status(500).json({ message: 'Error fetching user details', error: error.message });
    }
}

export async function changePassword(req, res) {
    try {
        const user_id = req.user.user_id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required' });
        }
        await Student.changePassword(user_id, currentPassword, newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(400).json({ message: error.message });
    }
}

export async function deleteAccount(req, res) {
    try {
        const user_id = req.user.user_id;
        await Student.deleteAccount(user_id);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Error deleting account' });
    }
}

export async function updateProfile(req, res) {
    try {
        const user_id = req.user.user_id;
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }
        await Student.updateProfile(user_id, { name, email });
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
}   


// Get all live sessions


// 8. Live Sessions
export async function getAllLiveSessions(req, res) {
    try {
        const sessions = await Student.getAllLiveSessions(); // Assumes this function exists in student.model.js
        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Error in getAllLiveSessions controller:', error);
        res.status(500).json({ message: 'Error fetching live sessions', error: error.message });
    }
}




// Get assignments for student
// student.controller.js
// Add these assignment functions to your student.controller.js

export async function getStudentAssignments(req, res) {
    try {
        const { project_id } = req.query;
        const userId = req.user.user_id;
        
        console.log(`[getStudentAssignments] Request from user ${userId}, project_id: ${project_id || 'all'}`);
        
        // Get assignments from your model
        const assignments = await Student.getStudentAssignments(userId, project_id);

        // Return empty array if no enrollments (not an error)
        res.json({
            success: true,
            data: assignments || []
        });
    } catch (error) {
        console.error('Error in getStudentAssignments:', error);
        console.error('Error stack:', error.stack);
        
        // If error is about missing enrollment, return empty array
        if (error.message && (error.message.includes('enrollment') || error.message.includes('No active course'))) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
}

export async function getAssignmentById(req, res) {
    try {
        const assignmentId = req.params.assignment_id;
        const userId = req.user.user_id;
        const assignment = await Student.getAssignmentById(assignmentId, userId);
        
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
        console.error('Error in getAssignmentById:', error);
        if (error.message.includes('access') || error.message.includes('enrollment')) {
            return res.status(403).json({ 
                success: false,
                message: error.message
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Error fetching assignment',
            error: error.message
        });
    }
}

export async function downloadAssignment(req, res) {
    try {
        const assignmentId = req.params.assignment_id;
        const userId = req.user.user_id;
        
        // Record the download
        await Student.recordAssignmentDownload(assignmentId, userId);
        
        res.json({
            success: true,
            message: 'Download recorded successfully'
        });
    } catch (error) {
        console.error('Error in downloadAssignment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Download failed',
            error: error.message
        });
    }
}

// Replace your assignment submission code with this:
export const submitAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const student_id = req.user.user_id;

    // Check assignment status and deadline
    try {
      const assignment = await AssignmentModel.getAssignmentById(assignment_id);
      if (!assignment || assignment.is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'This assignment is not available.'
        });
      }
      if (assignment.due_date) {
        const now = new Date();
        const due = new Date(assignment.due_date);
        if (now > due) {
          return res.status(400).json({
            success: false,
            message: `Submission closed. Due was ${due.toLocaleString()}`
          });
        }
      }
    } catch (checkErr) {
      console.error('Error checking assignment before submission:', checkErr);
      // Continue; do not block submission solely due to check error
    }

    // Collect all uploaded files (support multiple files)
    const uploadedFiles = [];
    console.log('📋 File upload request:', {
      hasFile: !!req.file,
      hasFiles: !!req.files,
      filesType: typeof req.files,
      filesIsArray: Array.isArray(req.files),
      filesLength: Array.isArray(req.files) ? req.files.length : Object.keys(req.files || {}).length
    });

    if (req.file) {
      console.log('✅ Found single file:', req.file.originalname, req.file.mimetype);
      uploadedFiles.push(req.file);
    } else if (Array.isArray(req.files) && req.files.length > 0) {
      console.log(`✅ Found ${req.files.length} files in array`);
      uploadedFiles.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        const value = req.files[key];
        if (Array.isArray(value)) {
          console.log(`✅ Found ${value.length} files in key "${key}"`);
          uploadedFiles.push(...value);
        } else if (value) {
          console.log(`✅ Found file in key "${key}":`, value.originalname);
          uploadedFiles.push(value);
        }
      }
    }

    if (uploadedFiles.length === 0) {
      console.error('❌ No files found in request');
      return res.status(400).json({
        success: false,
        message: 'At least one answer file is required'
      });
    }

    console.log(`📤 Processing ${uploadedFiles.length} file(s) for upload`);

    // Upload all files to Cloudinary
    const uploadedFileData = [];
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        console.log(`📤 Uploading file ${i + 1}/${uploadedFiles.length}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
        try {
          const fileUrl = await saveSubmissionFile(file);
          console.log(`✅ File ${i + 1} uploaded successfully: ${fileUrl}`);
          uploadedFileData.push({
            url: fileUrl,
            name: file.originalname,
            size: file.size
          });
        } catch (fileError) {
          console.error(`❌ Failed to upload file ${i + 1} (${file.originalname}):`, fileError);
          throw new Error(`Failed to upload ${file.originalname}: ${fileError.message}`);
        }
      }
    } catch (uploadError) {
      console.error('❌ File upload batch failed:', uploadError);
      console.error('Error stack:', uploadError.stack);
      return res.status(500).json({
        success: false,
        message: 'File upload failed: ' + uploadError.message,
        error: process.env.NODE_ENV !== 'production' ? uploadError.stack : undefined
      });
    }

    // Create submission record (use first file for backward compatibility)
    const firstFile = uploadedFileData[0];
    const submissionData = {
      assignment_id,
      user_id: student_id,
      answer_file_url: firstFile.url,
      answer_file_name: firstFile.name,
      file_size_bytes: firstFile.size,
      status: 'submitted'
    };

    console.log('💾 Creating submission record...');
    let submission;
    try {
      submission = await Student.createSubmission(submissionData);
      console.log('✅ Submission record created:', submission.submission_id);
    } catch (dbError) {
      console.error('❌ Failed to create submission record:', dbError);
      console.error('Error stack:', dbError.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to create submission record: ' + dbError.message,
        error: process.env.NODE_ENV !== 'production' ? dbError.stack : undefined
      });
    }

    // Store all files in assignment_submission_files table
    if (uploadedFileData.length > 0) {
      try {
        console.log(`💾 Storing ${uploadedFileData.length} file(s) in assignment_submission_files...`);
        const SubmissionFileModel = await import('../models/admin/assignment_submission_file.model.js');
        const storedFiles = await SubmissionFileModel.addSubmissionFiles(submission.submission_id, uploadedFileData, student_id);
        console.log(`✅ Stored ${storedFiles.length} file(s) successfully`);
      } catch (fileErr) {
        console.error('⚠️ Error storing submission files (non-critical):', fileErr);
        // Don't fail the submission if file storage fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: {
        ...submission,
        files: uploadedFileData
      }
    });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

export async function getMySubmissions(req, res) {
    try {
        const userId = req.user.user_id;
        console.log(`[getMySubmissions] Request from user ${userId}`);
        
        const submissions = await Student.getSubmissionsByUser(userId);

        // Return empty array if no enrollments (not an error)
        res.json({
            success: true,
            data: submissions || []
        });
    } catch (error) {
        console.error('Error getting submissions:', error);
        console.error('Error stack:', error.stack);
        
        // If error is about missing enrollment, return empty array
        if (error.message && (error.message.includes('enrollment') || error.message.includes('No active course'))) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Failed to get submissions',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
}


// export async function downloadSubmission(req, res) {
//   try {
//     const submissionId = parseInt(req.params.submission_id);
//     const userId = req.user.user_id;
    
//     console.log('Download submission request:', { submissionId, userId });

//     if (isNaN(submissionId)) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Invalid submission ID' 
//       });
//     }

//     const submission = await Student.getSubmissionById(submissionId);
    
//     if (!submission) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'Submission not found' 
//       });
//     }

//     // Check permissions
//     if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
//       return res.status(403).json({ 
//         success: false,
//         message: 'Access denied' 
//       });
//     }

//     // Handle file path
//     let filePath;
//     if (path.isAbsolute(submission.answer_file_url)) {
//       filePath = submission.answer_file_url;
//     } else {
//       // Remove any leading slashes or dots and join with process.cwd()
//       const cleanPath = submission.answer_file_url.replace(/^[\.\/\\]+/, '');
//       filePath = path.join(process.cwd(), cleanPath);
//     }

//     console.log('Attempting to download file:', filePath);

//     // Check if file exists
//     if (!fs.existsSync(filePath)) {
//       console.error('File not found:', filePath);
      
//       // Try alternative paths
//       const alternativePaths = [
//         path.join(process.cwd(), 'uploads', 'assignment-submissions', path.basename(submission.answer_file_url)),
//         path.join(process.cwd(), 'uploads', submission.answer_file_url),
//         path.join(process.cwd(), path.basename(submission.answer_file_url))
//       ];

//       let foundPath = null;
//       for (const altPath of alternativePaths) {
//         if (fs.existsSync(altPath)) {
//           foundPath = altPath;
//           break;
//         }
//       }

//       if (!foundPath) {
//         return res.status(404).json({ 
//           success: false,
//           message: 'File not found on server',
//           searched_paths: [filePath, ...alternativePaths]
//         });
//       }

//       filePath = foundPath;
//     }

//     // Download the file
//     res.download(filePath, submission.answer_file_name, (err) => {
//       if (err) {
//         console.error('Download error:', err);
//         if (!res.headersSent) {
//           res.status(500).json({ 
//             success: false,
//             message: 'Error downloading file',
//             error: err.message 
//           });
//         }
//       } else {
//         console.log('File downloaded successfully:', submission.answer_file_name);
//       }
//     });

//   } catch (error) {
//     console.error('Download submission error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Internal server error during download',
//       error: error.message 
//     });
//   }
// }


export async function downloadSubmission(req, res) {
  try {
    const submissionId = parseInt(req.params.submission_id, 10);
    const userId = req.user.user_id;

    if (isNaN(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID' });
    }

    const submission = await Student.getSubmissionById(submissionId);
    if (!submission || !submission.answer_file_url) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return streamOrRedirect(
      res,
      submission.answer_file_url,
      submission.answer_file_name || `submission-${submissionId}`,
      'Submission file not found on server'
    );
  } catch (error) {
    console.error('Download submission error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal server error during download', error: error.message });
    }
  }
}


export async function getSubmissionDetails(req, res) {
  try {
    const submissionId = parseInt(req.params.submission_id, 10);
    const userId = req.user.user_id;

    if (isNaN(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID' });
    }

    console.log('Getting submission details for ID:', submissionId);
    
    // Get submission details
    const submission = await Student.getSubmissionById(submissionId);
    if (!submission) {
      console.log('Submission not found for ID:', submissionId);
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Verify ownership
    if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
      console.log('Access denied for user:', userId, 'on submission:', submissionId);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get submission files
    console.log('Fetching files for submission:', submissionId);
    const files = await Student.getSubmissionFiles(submissionId);
    console.log('Files found:', files);

    // Format response
    const response = {
      success: true,
      data: {
        submission: {
          id: submission.submission_id,
          assignment_id: submission.assignment_id,
          assignment_title: submission.assignment_title,
          user_id: submission.user_id,
          submitted_at: submission.submitted_at,
          grade: submission.grade,
          feedback: submission.feedback,
          status: submission.status,
          updated_at: submission.updated_at,
          updated_by_admin: submission.updated_by_admin
        },
        files: files || []  // Ensure files is always an array
      }
    };

    console.log('Sending response for submission:', submissionId);
    return res.json(response);
  } catch (error) {
    console.error('Error in getSubmissionDetails:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to get submission details',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
}

// Delete own submission
export async function deleteMySubmission(req, res) {
  try {
    const submissionId = parseInt(req.params.submission_id, 10);
    const userId = req.user.user_id;
    if (isNaN(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID' });
    }
    const submission = await Student.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own submission' });
    }
    // Optionally block delete after due date
    const assignment = await AssignmentModel.getAssignmentById(submission.assignment_id);
    if (assignment && assignment.due_date) {
      const now = new Date();
      const due = new Date(assignment.due_date);
      if (now > due) {
        return res.status(400).json({ success: false, message: 'Submission deadline has passed' });
      }
    }
    await AssignmentModel.deleteSubmission(submissionId);
    return res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error in deleteMySubmission:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete submission', error: error.message });
  }
}
// Allow student to edit their own submission (add/remove files) if before due date
export async function editMySubmission(req, res) {
  try {
    const { submission_id } = req.params;
    const userId = req.user.user_id;
    if (!submission_id) {
      return res.status(400).json({ success: false, message: 'submission_id is required' });
    }

    // Load submission and ensure ownership
    const submission = await Student.getSubmissionById(parseInt(submission_id, 10));
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own submission' });
    }

    // Check due date not passed
    const assignment = await AssignmentModel.getAssignmentById(submission.assignment_id);
    if (assignment && assignment.due_date) {
      const now = new Date();
      const due = new Date(assignment.due_date);
      if (now > due) {
        return res.status(400).json({ success: false, message: 'Submission deadline has passed' });
      }
    }

    // Collect uploaded files (support multiple)
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);

    // If nothing to change
    if (files.length === 0 && !req.body.remove_file_ids) {
      return res.status(400).json({ success: false, message: 'No changes provided. Upload files or specify remove_file_ids.' });
    }

    // Add files
    let addedFiles = [];
    if (files.length > 0) {
      const uploaded = [];
      for (const f of files) {
        const url = await saveSubmissionFile(f);
        uploaded.push({ url, name: f.originalname, size: f.size });
      }
      const SubmissionFileModel = await import('../models/admin/assignment_submission_file.model.js');
      addedFiles = await SubmissionFileModel.addSubmissionFiles(submission_id, uploaded, userId);
    }

    // Remove files
    if (req.body.remove_file_ids) {
      const SubmissionFileModel = await import('../models/admin/assignment_submission_file.model.js');
      const ids = Array.isArray(req.body.remove_file_ids)
        ? req.body.remove_file_ids
        : String(req.body.remove_file_ids).split(',').map(s => s.trim()).filter(Boolean);
      for (const id of ids) {
        await SubmissionFileModel.deleteFile(Number(id));
      }
    }

    // Return current files
    const filesNow = await Student.getSubmissionFiles(parseInt(submission_id, 10));
    return res.json({
      success: true,
      message: 'Submission updated successfully',
      data: {
        submission: {
          id: submission.submission_id,
          assignment_id: submission.assignment_id,
          assignment_title: submission.assignment_title,
          submitted_at: submission.submitted_at,
          grade: submission.grade,
          feedback: submission.feedback,
          status: submission.status
        },
        files: filesNow,
        addedFiles
      }
    });
  } catch (error) {
    console.error('Error in editMySubmission:', error);
    return res.status(500).json({ success: false, message: 'Failed to edit submission', error: error.message });
  }
}

// Allow student to remove a specific file from their submission
export async function removeMySubmissionFile(req, res) {
  try {
    const { file_id } = req.params;
    const userId = req.user.user_id;
    if (!file_id) {
      return res.status(400).json({ success: false, message: 'file_id is required' });
    }
    // Verify file belongs to user's submission
    const submissionIdResult = await Student.getSubmissionIdByFileId(Number(file_id));
    if (!submissionIdResult) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const submission = await Student.getSubmissionById(submissionIdResult);
    if (!submission || submission.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only modify your own submission files' });
    }
    // Check due date
    const assignment = await AssignmentModel.getAssignmentById(submission.assignment_id);
    if (assignment && assignment.due_date && new Date() > new Date(assignment.due_date)) {
      return res.status(400).json({ success: false, message: 'Submission deadline has passed' });
    }
    const SubmissionFileModel = await import('../models/admin/assignment_submission_file.model.js');
    await SubmissionFileModel.deleteFile(Number(file_id));
    return res.json({ success: true, message: 'File removed from submission' });
  } catch (error) {
    console.error('Error in removeMySubmissionFile:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove file', error: error.message });
  }
}
export async function getSubmissionFiles(submissionId) {
    try {
        const files = await sql`
            SELECT 
                file_id,
                submission_id,
                file_name,
                file_url,
                file_size_bytes,
                file_type,
                created_at
            FROM assignment_submission_files
            WHERE submission_id = ${submissionId}
            ORDER BY created_at ASC
        `;
        
        return files.map(file => ({
            id: file.file_id,
            name: file.file_name,
            url: file.file_url,
            size: file.file_size_bytes,
            type: file.file_type,
            uploadedAt: file.created_at
        }));
    } catch (error) {
        console.error('Error getting submission files:', error);
        throw error;
    }
}
export async function downloadLessonFile(req, res) {
  try {
    const lessonId = parseInt(req.params.lesson_id);
    if (isNaN(lessonId)) {
      return res.status(400).json({ message: 'Invalid lesson ID' });
    }

    const lesson = await Student.getLessonDetails(lessonId);
    if (!lesson || !lesson.file_url) {
      return res.status(404).json({ message: 'Lesson file not found' });
    }

    return streamOrRedirect(
      res,
      lesson.file_url,
      lesson.title || `lesson-${lessonId}`,
      'File not found on server'
    );
  } catch (error) {
    console.error('Lesson File Download Error:', error);
    res.status(500).json({ message: 'Internal server error during download', error: error.message });
  }
}

// Generic safe proxy download for allowed URLs (e.g., Cloudinary or local /uploads)
export async function proxyDownload(req, res) {
  try {
    const { url, name } = req.query;
    if (!url) return res.status(400).json({ message: 'url query is required' });
    const decoded = decodeURIComponent(url);
    // Allow only Cloudinary or local uploads
    try {
      const u = new URL(decoded, 'http://dummy.base');
      const host = u.host;
      const isCloudinary = /(^|\.)res\.cloudinary\.com$/i.test(host);
      const isUploads = decoded.startsWith('/uploads/') || decoded.includes('/uploads/');
      if (!isCloudinary && !isUploads) {
        return res.status(400).json({ message: 'URL not allowed' });
      }
    } catch {
      // If relative path (e.g., /uploads/...), allow
      if (!(decoded.startsWith('/uploads/'))) {
        return res.status(400).json({ message: 'Invalid url' });
      }
    }
    return streamOrRedirect(res, decoded, name || undefined, 'File not found');
  } catch (error) {
    console.error('Proxy download error:', error);
    res.status(500).json({ message: 'Internal server error during download', error: error.message });
  }
}
