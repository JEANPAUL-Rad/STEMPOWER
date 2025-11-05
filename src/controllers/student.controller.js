import * as Student from '../models/student.model.js';
import * as AssignmentModel from '../models/admin/assignment.model.js';
import { saveFile, saveSubmissionFile } from '../utils/saveFile.js';
import path from 'path';
import fs from 'fs';

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
            const { hasAccessToModule } = await import('../utils/enrollment.js');
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
        
        // Get assignments from your model
        const assignments = await Student.getStudentAssignments(userId, project_id);

        // Return empty array if no enrollments (not an error)
        res.json({
            success: true,
            data: assignments || []
        });
    } catch (error) {
        console.error('Error in getStudentAssignments:', error);
        
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
            error: error.message
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Answer file is required'
      });
    }

    // Upload file to Cloudinary
    let fileResult;
    try {
      fileResult = await saveSubmissionFile(req.file);
    } catch (uploadError) {
      console.error('File upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'File upload failed: ' + uploadError.message
      });
    }

    const submissionData = {
      assignment_id,
      student_id,
      answer_file_url: fileResult,
      answer_file_name: req.file.originalname
    };

    const submission = await AssignmentModel.createSubmission(submissionData);

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: submission
    });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment'
    });
  }
};

export async function getMySubmissions(req, res) {
    try {
        const userId = req.user.user_id;
        const submissions = await Student.getSubmissionsByUser(userId);

        // Return empty array if no enrollments (not an error)
        res.json({
            success: true,
            data: submissions || []
        });
    } catch (error) {
        console.error('Error getting submissions:', error);
        
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
            error: error.message
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

    // If file_url is a Cloudinary URL, redirect client to it
    if (lesson.file_url.includes('cloudinary.com')) {
      console.log(`📤 Redirecting to Cloudinary: ${lesson.file_url}`);
      return res.redirect(lesson.file_url);
    }

    // Fallback for local files (if any still exist)
    const filePath = path.join(process.cwd(), lesson.file_url.replace(/^[\/\\]+/, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server', filePath });
    }

    res.download(filePath, path.basename(filePath));
  } catch (error) {
    console.error('Lesson File Download Error:', error);
    res.status(500).json({ message: 'Internal server error during download', error: error.message });
  }
}

