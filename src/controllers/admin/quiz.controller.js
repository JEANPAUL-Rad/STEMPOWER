


// // controllers/admin/quiz.controller.js - FIXED VERSION WITH MARKS AND TIME CONVERSION
// import * as QuizModel from '../../models/admin/quiz.model.js';

// // FIXED: Proper timezone conversion utility functions
// const convertUTCToCAT = (utcDateString) => {
//   if (!utcDateString) return null;
//   try {
//     const utcDate = new Date(utcDateString);
//     if (isNaN(utcDate.getTime())) return null;
    
//     // Convert UTC to CAT (UTC+2)
//     const catDate = new Date(utcDate.getTime() + (2 * 60 * 60 * 1000));
//     return catDate;
//   } catch (error) {
//     console.error('Error converting UTC to CAT:', error);
//     return null;
//   }
// };

// const convertCATToUTC = (catDateString) => {
//   if (!catDateString) return null;
//   try {
//     const catDate = new Date(catDateString);
//     if (isNaN(catDate.getTime())) return null;
    
//     // Convert CAT (UTC+2) to UTC by subtracting 2 hours
//     const utcDate = new Date(catDate.getTime() - (2 * 60 * 60 * 1000));
//     return utcDate.toISOString();
//   } catch (error) {
//     console.error('Error converting CAT to UTC:', error);
//     return null;
//   }
// };

// const formatCATDisplay = (utcDateString) => {
//   if (!utcDateString) return null;
//   try {
//     const catDate = convertUTCToCAT(utcDateString);
//     if (!catDate) return null;
    
//     return catDate.toLocaleString('en-US', {
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: false,
//       timeZone: 'UTC' // Since we already converted, treat as UTC for display
//     });
//   } catch (error) {
//     console.error('Error formatting CAT display:', error);
//     return null;
//   }
// };

// export async function createQuiz(req, res) {
//   try {
//     const { 
//       title, 
//       description, 
//       project_id, 
//       lesson_id, 
//       time_limit, 
//       start_time, 
//       end_time,
//       marks = 100, // NEW: Added marks with default value
//       // Enhanced settings with defaults
//       auto_start = true,
//       auto_submit = true,
//       grace_period = 5,
//       max_attempts = 1,
//       shuffle_questions = false,
//       show_results_immediately = false,
//       allow_navigation = true
//     } = req.body;
    
//     // Validations
//     if (!title) return res.status(400).json({ message: "Title is required" });
    
//     // NEW: Validate marks
//     const marksValue = parseInt(marks);
//     if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
//       return res.status(400).json({ message: "Marks must be a number between 0 and 100" });
//     }
    
//     // FIXED: Proper time conversion from frontend CAT to backend UTC
//     let startTimeUTC = null;
//     let endTimeUTC = null;
    
//     if (start_time) {
//       startTimeUTC = convertCATToUTC(start_time);
//       if (!startTimeUTC) {
//         return res.status(400).json({ message: "Invalid start time format" });
//       }
//     }
    
//     if (end_time) {
//       endTimeUTC = convertCATToUTC(end_time);
//       if (!endTimeUTC) {
//         return res.status(400).json({ message: "Invalid end time format" });
//       }
//     }
    
//     // Validate times
//     if (startTimeUTC && endTimeUTC && new Date(startTimeUTC) >= new Date(endTimeUTC)) {
//       return res.status(400).json({ message: "Start time must be before end time" });
//     }

//     // Basic validations
//     if (time_limit && time_limit < 1) {
//       return res.status(400).json({ message: "Time limit must be at least 1 minute" });
//     }

//     if (grace_period && (grace_period < 0 || grace_period > 30)) {
//       return res.status(400).json({ message: "Grace period must be between 0 and 30 minutes" });
//     }

//     if (max_attempts && (max_attempts < 1 || max_attempts > 5)) {
//       return res.status(400).json({ message: "Max attempts must be between 1 and 5" });
//     }

//     console.log('Creating quiz:', {
//       title,
//       marks: marksValue,
//       startTimeUTC,
//       endTimeUTC,
//       auto_start,
//       auto_submit
//     });
    
//     const quiz = await QuizModel.createQuiz({ 
//       title, 
//       description, 
//       project_id: project_id ? parseInt(project_id) : null, 
//       lesson_id: lesson_id ? parseInt(lesson_id) : null, 
//       time_limit: time_limit ? parseInt(time_limit) : null, 
//       start_time: startTimeUTC, 
//       end_time: endTimeUTC,
//       marks: marksValue, // NEW: Include marks
//       auto_start,
//       auto_submit,
//       grace_period: parseInt(grace_period),
//       max_attempts: parseInt(max_attempts),
//       shuffle_questions,
//       show_results_immediately,
//       allow_navigation
//     });
    
//     // FIXED: Return quiz with proper CAT times for frontend display
//     const responseQuiz = {
//       ...quiz,
//       start_time_cat: quiz.start_time ? convertUTCToCAT(quiz.start_time)?.toISOString() : null,
//       end_time_cat: quiz.end_time ? convertUTCToCAT(quiz.end_time)?.toISOString() : null,
//       start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//       end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//     };
    
//     res.status(201).json(responseQuiz);
//   } catch (err) {
//     console.error('Create quiz error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function getAllQuizzes(req, res) {
//   try {
//     const { project_id, lesson_id, status } = req.query;
//     const quizzes = await QuizModel.getAllQuizzes({ project_id, lesson_id, status });
    
//     // FIXED: Add proper CAT times to each quiz for frontend display
//     const quizzesWithCAT = quizzes.map(quiz => ({
//       ...quiz,
//       start_time_cat: quiz.start_time ? convertUTCToCAT(quiz.start_time)?.toISOString() : null,
//       end_time_cat: quiz.end_time ? convertUTCToCAT(quiz.end_time)?.toISOString() : null,
//       start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//       end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//     }));
    
//     res.json(quizzesWithCAT);
//   } catch (err) {
//     console.error('Get all quizzes error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function getQuizById(req, res) {
//   try {
//     const quiz = await QuizModel.getQuizById(req.params.quiz_id);
//     if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    
//     // FIXED: Add proper CAT times for frontend display
//     const responseQuiz = {
//       ...quiz,
//       start_time_cat: quiz.start_time ? convertUTCToCAT(quiz.start_time)?.toISOString() : null,
//       end_time_cat: quiz.end_time ? convertUTCToCAT(quiz.end_time)?.toISOString() : null,
//       start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//       end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//     };
    
//     res.json(responseQuiz);
//   } catch (err) {
//     console.error('Get quiz by ID error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function updateQuiz(req, res) {
//   try {
//     const updateData = { ...req.body };
    
//     // NEW: Validate and handle marks
//     if (updateData.marks !== undefined) {
//       const marksValue = parseInt(updateData.marks);
//       if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
//         return res.status(400).json({ message: "Marks must be a number between 0 and 100" });
//       }
//       updateData.marks = marksValue;
//     }
    
//     // FIXED: Handle proper time conversion from CAT to UTC
//     if (updateData.start_time) {
//       updateData.start_time = convertCATToUTC(updateData.start_time);
//       if (!updateData.start_time) {
//         return res.status(400).json({ message: "Invalid start time format" });
//       }
//     }
    
//     if (updateData.end_time) {
//       updateData.end_time = convertCATToUTC(updateData.end_time);
//       if (!updateData.end_time) {
//         return res.status(400).json({ message: "Invalid end time format" });
//       }
//     }
    
//     // Validate times if both provided
//     if (updateData.start_time && updateData.end_time && new Date(updateData.start_time) >= new Date(updateData.end_time)) {
//       return res.status(400).json({ message: "Start time must be before end time" });
//     }

//     // Additional validations
//     if (updateData.time_limit && updateData.time_limit < 1) {
//       return res.status(400).json({ message: "Time limit must be at least 1 minute" });
//     }

//     if (updateData.grace_period && (updateData.grace_period < 0 || updateData.grace_period > 30)) {
//       return res.status(400).json({ message: "Grace period must be between 0 and 30 minutes" });
//     }

//     if (updateData.max_attempts && (updateData.max_attempts < 1 || updateData.max_attempts > 5)) {
//       return res.status(400).json({ message: "Max attempts must be between 1 and 5" });
//     }
    
//     // Convert numeric fields
//     if (updateData.project_id) updateData.project_id = parseInt(updateData.project_id);
//     if (updateData.lesson_id) updateData.lesson_id = parseInt(updateData.lesson_id);
//     if (updateData.time_limit) updateData.time_limit = parseInt(updateData.time_limit);
//     if (updateData.grace_period) updateData.grace_period = parseInt(updateData.grace_period);
//     if (updateData.max_attempts) updateData.max_attempts = parseInt(updateData.max_attempts);
    
//     console.log('Updating quiz:', req.params.quiz_id, updateData);
    
//     const updated = await QuizModel.updateQuiz(req.params.quiz_id, updateData);
    
//     if (!updated) return res.status(404).json({ message: "Quiz not found" });
    
//     // FIXED: Return updated quiz with proper CAT times
//     const responseQuiz = {
//       ...updated,
//       start_time_cat: updated.start_time ? convertUTCToCAT(updated.start_time)?.toISOString() : null,
//       end_time_cat: updated.end_time ? convertUTCToCAT(updated.end_time)?.toISOString() : null,
//       start_time_cat_formatted: formatCATDisplay(updated.start_time),
//       end_time_cat_formatted: formatCATDisplay(updated.end_time)
//     };
    
//     res.json(responseQuiz);
//   } catch (err) {
//     console.error('Update quiz error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function deleteQuiz(req, res) {
//   try {
//     // Check for active sessions (if table exists)
//     try {
//       const activeSessions = await QuizModel.getActiveQuizSessions(req.params.quiz_id);
//       if (activeSessions.length > 0) {
//         return res.status(400).json({ 
//           message: `Cannot delete quiz with ${activeSessions.length} active sessions. End the quiz first.` 
//         });
//       }
//     } catch (error) {
//       // Sessions table doesn't exist, continue with deletion
//       console.log('Active sessions check skipped:', error.message);
//     }

//     await QuizModel.deleteQuiz(req.params.quiz_id);
//     res.json({ message: "Quiz deleted" });
//   } catch (err) {
//     console.error('Delete quiz error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// // Enhanced control endpoints with proper time conversion
// export async function startQuizNow(req, res) {
//   try {
//     const quiz = await QuizModel.forceStartQuiz(req.params.quiz_id);
//     if (!quiz) return res.status(404).json({ message: "Quiz not found" });

//     console.log(`Quiz ${quiz.quiz_id} manually started by admin`);
//     res.json({ 
//       message: "Quiz started immediately", 
//       quiz: {
//         ...quiz,
//         start_time_cat: quiz.start_time ? convertUTCToCAT(quiz.start_time)?.toISOString() : null,
//         end_time_cat: quiz.end_time ? convertUTCToCAT(quiz.end_time)?.toISOString() : null,
//         start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//         end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//       }
//     });
//   } catch (err) {
//     console.error('Start quiz now error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function endQuizNow(req, res) {
//   try {
//     const quiz = await QuizModel.forceEndQuiz(req.params.quiz_id);
//     if (!quiz) return res.status(404).json({ message: "Quiz not found" });

//     console.log(`Quiz ${quiz.quiz_id} manually ended by admin`);
//     res.json({ 
//       message: "Quiz ended and all active sessions auto-submitted", 
//       quiz: {
//         ...quiz,
//         start_time_cat: quiz.start_time ? convertUTCToCAT(quiz.start_time)?.toISOString() : null,
//         end_time_cat: quiz.end_time ? convertUTCToCAT(quiz.end_time)?.toISOString() : null,
//         start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//         end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//       }
//     });
//   } catch (err) {
//     console.error('End quiz now error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function pauseQuiz(req, res) {
//   try {
//     const quiz = await QuizModel.updateQuizStatus(req.params.quiz_id, 'paused');
//     if (!quiz) return res.status(404).json({ message: "Quiz not found" });

//     console.log(`Quiz ${quiz.quiz_id} paused by admin`);
//     res.json({ 
//       message: "Quiz paused", 
//       quiz: {
//         ...quiz,
//         start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//         end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//       }
//     });
//   } catch (err) {
//     console.error('Pause quiz error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function resumeQuiz(req, res) {
//   try {
//     const quiz = await QuizModel.updateQuizStatus(req.params.quiz_id, 'active');
//     if (!quiz) return res.status(404).json({ message: "Quiz not found" });

//     console.log(`Quiz ${quiz.quiz_id} resumed by admin`);
//     res.json({ 
//       message: "Quiz resumed", 
//       quiz: {
//         ...quiz,
//         start_time_cat_formatted: formatCATDisplay(quiz.start_time),
//         end_time_cat_formatted: formatCATDisplay(quiz.end_time)
//       }
//     });
//   } catch (err) {
//     console.error('Resume quiz error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// export async function getQuizLiveStats(req, res) {
//   try {
//     const stats = await QuizModel.getQuizLiveStats(req.params.quiz_id);
//     const activeSessions = await QuizModel.getActiveQuizSessions(req.params.quiz_id);
    
//     res.json({
//       ...stats,
//       active_sessions: parseInt(stats.active_sessions) || 0,
//       completed_sessions: parseInt(stats.completed_sessions) || 0,
//       average_progress: parseFloat(stats.average_progress) || 0,
//       students: activeSessions.map(session => ({
//         student_name: session.student_name,
//         started_at: session.started_at,
//         progress: 0 // Will be calculated when session management is fully implemented
//       }))
//     });
//   } catch (err) {  
//     console.error('Get quiz live stats error:', err);
//     res.status(500).json({ message: err.message });
//   }
// }

// controllers/admin/quiz.controller.js - UPDATED WITH POSTGRESQL TIMEZONE SUPPORT
import * as QuizModel from '../../models/admin/quiz.model.js';



// IMPROVED: Use PostgreSQL's built-in timezone conversion
// Store UTC in database, convert using PostgreSQL's AT TIME ZONE
const APP_TIMEZONE = 'Africa/Kigali'; // Set your application timezone


export async function createQuiz(req, res) {
  try {
    const { 
      title, 
      description, 
      project_id, 
      lesson_id, 
      time_limit, 
      start_time, 
      end_time,
      marks = 100,
      auto_start = true,
      auto_submit = true,
      grace_period = 5,
      max_attempts = 1,
      shuffle_questions = false,
      show_results_immediately = false,
      allow_navigation = true
    } = req.body;
    
    // Validations
    if (!title) return res.status(400).json({ message: "Title is required" });
    
    // Validate marks
    const marksValue = parseInt(marks);
    if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
      return res.status(400).json({ message: "Marks must be a number between 0 and 100" });
    }
    
    // IMPROVED: Let PostgreSQL handle timezone conversion
    // Frontend sends local time, we treat it as Kigali time and convert to UTC in database
    if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    // Basic validations
    if (time_limit && time_limit < 1) {
      return res.status(400).json({ message: "Time limit must be at least 1 minute" });
    }

    if (grace_period && (grace_period < 0 || grace_period > 30)) {
      return res.status(400).json({ message: "Grace period must be between 0 and 30 minutes" });
    }

    if (max_attempts && (max_attempts < 1 || max_attempts > 5)) {
      return res.status(400).json({ message: "Max attempts must be between 1 and 5" });
    }

    console.log('Creating quiz with timezone-aware dates:', {
      title,
      marks: marksValue,
      start_time,
      end_time,
      timezone: APP_TIMEZONE
    });
    
    const quiz = await QuizModel.createQuiz({ 
      title, 
      description, 
      project_id: project_id ? parseInt(project_id) : null, 
      lesson_id: lesson_id ? parseInt(lesson_id) : null, 
      time_limit: time_limit ? parseInt(time_limit) : null, 
      start_time, // Pass as-is, let PostgreSQL handle conversion
      end_time,   // Pass as-is, let PostgreSQL handle conversion
      marks: marksValue,
      auto_start,
      auto_submit,
      grace_period: parseInt(grace_period),
      max_attempts: parseInt(max_attempts),
      shuffle_questions,
      show_results_immediately,
      allow_navigation,
      timezone: APP_TIMEZONE
    });
    
    res.status(201).json(quiz);
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function getAllQuizzes(req, res) {
  try {
    const { project_id, lesson_id, status } = req.query;
    const quizzes = await QuizModel.getAllQuizzes({ 
      project_id, 
      lesson_id, 
      status, 
      timezone: APP_TIMEZONE 
    });
    
    res.json(quizzes);
  } catch (err) {
    console.error('Get all quizzes error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function getQuizById(req, res) {
  try {
    const quiz = await QuizModel.getQuizById(req.params.quiz_id, APP_TIMEZONE);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    
    res.json(quiz);
  } catch (err) {
    console.error('Get quiz by ID error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function updateQuiz(req, res) {
  try {
    const updateData = { ...req.body };
    
    // Validate marks
    if (updateData.marks !== undefined) {
      const marksValue = parseInt(updateData.marks);
      if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
        return res.status(400).json({ message: "Marks must be a number between 0 and 100" });
      }
      updateData.marks = marksValue;
    }
    
    // Validate times if both provided
    if (updateData.start_time && updateData.end_time && 
        new Date(updateData.start_time) >= new Date(updateData.end_time)) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    // Additional validations
    if (updateData.time_limit && updateData.time_limit < 1) {
      return res.status(400).json({ message: "Time limit must be at least 1 minute" });
    }

    if (updateData.grace_period && (updateData.grace_period < 0 || updateData.grace_period > 30)) {
      return res.status(400).json({ message: "Grace period must be between 0 and 30 minutes" });
    }

    if (updateData.max_attempts && (updateData.max_attempts < 1 || updateData.max_attempts > 5)) {
      return res.status(400).json({ message: "Max attempts must be between 1 and 5" });
    }
    
    // Convert numeric fields
    if (updateData.project_id) updateData.project_id = parseInt(updateData.project_id);
    if (updateData.lesson_id) updateData.lesson_id = parseInt(updateData.lesson_id);
    if (updateData.time_limit) updateData.time_limit = parseInt(updateData.time_limit);
    if (updateData.grace_period) updateData.grace_period = parseInt(updateData.grace_period);
    if (updateData.max_attempts) updateData.max_attempts = parseInt(updateData.max_attempts);
    
    console.log('Updating quiz:', req.params.quiz_id, updateData);
    
    const updated = await QuizModel.updateQuiz(
      req.params.quiz_id, 
      updateData, 
      APP_TIMEZONE
    );
    
    if (!updated) return res.status(404).json({ message: "Quiz not found" });
    
    res.json(updated);
  } catch (err) {
    console.error('Update quiz error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function deleteQuiz(req, res) {
  try {
    // Check for active sessions
    try {
      const activeSessions = await QuizModel.getActiveQuizSessions(req.params.quiz_id);
      if (activeSessions.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete quiz with ${activeSessions.length} active sessions. End the quiz first.` 
        });
      }
    } catch (error) {
      console.log('Active sessions check skipped:', error.message);
    }

    await QuizModel.deleteQuiz(req.params.quiz_id);
    res.json({ message: "Quiz deleted" });
  } catch (err) {
    console.error('Delete quiz error:', err);
    res.status(500).json({ message: err.message });
  }
}

// Enhanced control endpoints
export async function startQuizNow(req, res) {
  try {
    const quiz = await QuizModel.forceStartQuiz(req.params.quiz_id, APP_TIMEZONE);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    console.log(`Quiz ${quiz.quiz_id} manually started by admin`);
    res.json({ 
      message: "Quiz started immediately", 
      quiz
    });
  } catch (err) {
    console.error('Start quiz now error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function endQuizNow(req, res) {
  try {
    const quiz = await QuizModel.forceEndQuiz(req.params.quiz_id, APP_TIMEZONE);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    console.log(`Quiz ${quiz.quiz_id} manually ended by admin`);
    res.json({ 
      message: "Quiz ended and all active sessions auto-submitted", 
      quiz
    });
  } catch (err) {
    console.error('End quiz now error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function pauseQuiz(req, res) {
  try {
    const quiz = await QuizModel.updateQuizStatus(req.params.quiz_id, 'paused', APP_TIMEZONE);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    console.log(`Quiz ${quiz.quiz_id} paused by admin`);
    res.json({ 
      message: "Quiz paused", 
      quiz
    });
  } catch (err) {
    console.error('Pause quiz error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function resumeQuiz(req, res) {
  try {
    const quiz = await QuizModel.updateQuizStatus(req.params.quiz_id, 'active', APP_TIMEZONE);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    console.log(`Quiz ${quiz.quiz_id} resumed by admin`);
    res.json({ 
      message: "Quiz resumed", 
      quiz
    });
  } catch (err) {
    console.error('Resume quiz error:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function getQuizLiveStats(req, res) {
  try {
    const stats = await QuizModel.getQuizLiveStats(req.params.quiz_id);
    const activeSessions = await QuizModel.getActiveQuizSessions(req.params.quiz_id);
    
    res.json({
      ...stats,
      active_sessions: parseInt(stats.active_sessions) || 0,
      completed_sessions: parseInt(stats.completed_sessions) || 0,
      average_progress: parseFloat(stats.average_progress) || 0,
      students: activeSessions.map(session => ({
        student_name: session.student_name,
        started_at: session.started_at,
        progress: 0
      }))
    });
  } catch (err) {  
    console.error('Get quiz live stats error:', err);
    res.status(500).json({ message: err.message });
  }
}