// middleware/checkCourseAccess.js
// Middleware to verify student has access to course content
import { getUserEnrolledModules, hasAccessToModule } from '../utils/enrollment.js';
import sql from '../config/db.js';

/**
 * Middleware to check if user has access to a specific week/course
 * Expects week_id in req.params or req.body
 */
export async function checkWeekAccess(req, res, next) {
  try {
    const user_id = req.user.user_id;
    const week_id = req.params.week_id || req.body.week_id;
    
    if (!week_id) {
      return res.status(400).json({ message: 'Week ID is required' });
    }
    
    // Get user's enrolled modules
    const modules = await getUserEnrolledModules(user_id);
    
    if (modules.length === 0) {
      return res.status(403).json({ 
        message: 'No active course enrollment found. Please complete your registration and payment.' 
      });
    }
    
    // Verify week belongs to enrolled module
    const week = await sql`
      SELECT * FROM weeks 
      WHERE week_id = ${week_id} 
        AND module = ANY(${modules})
      LIMIT 1
    `;
    
    if (week.length === 0) {
      return res.status(403).json({ 
        message: 'You do not have access to this course' 
      });
    }
    
    // Store enrolled modules for use in controllers
    req.enrolledModules = modules;
    next();
  } catch (error) {
    console.error('Error in checkWeekAccess:', error);
    res.status(500).json({ message: 'Error verifying course access', error: error.message });
  }
}

/**
 * Middleware to check if user has access to a specific project
 * Expects project_id in req.params or req.body
 */
export async function checkProjectAccess(req, res, next) {
  try {
    const user_id = req.user.user_id;
    const project_id = req.params.project_id || req.body.project_id;
    
    if (!project_id) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    
    // Get user's enrolled modules
    const modules = await getUserEnrolledModules(user_id);
    
    if (modules.length === 0) {
      return res.status(403).json({ 
        message: 'No active course enrollment found. Please complete your registration and payment.' 
      });
    }
    
    // Verify project belongs to accessible week
    const project = await sql`
      SELECT p.* FROM projects p
      JOIN weeks w ON p.week_id = w.week_id
      WHERE p.project_id = ${project_id} 
        AND w.module = ANY(${modules})
      LIMIT 1
    `;
    
    if (project.length === 0) {
      return res.status(403).json({ 
        message: 'You do not have access to this project' 
      });
    }
    
    req.enrolledModules = modules;
    next();
  } catch (error) {
    console.error('Error in checkProjectAccess:', error);
    res.status(500).json({ message: 'Error verifying project access', error: error.message });
  }
}

/**
 * Middleware to check if user has access to a specific quiz
 * Expects quiz_id in req.params or req.body
 */
export async function checkQuizAccess(req, res, next) {
  try {
    const user_id = req.user.user_id;
    const quiz_id = req.params.quiz_id || req.body.quiz_id;
    
    if (!quiz_id) {
      return res.status(400).json({ message: 'Quiz ID is required' });
    }
    
    // Get user's enrolled modules
    const modules = await getUserEnrolledModules(user_id);
    
    if (modules.length === 0) {
      return res.status(403).json({ 
        message: 'No active course enrollment found. Please complete your registration and payment.' 
      });
    }
    
    // Verify quiz belongs to accessible project/week
    const quiz = await sql`
      SELECT q.* FROM quizzes q
      JOIN projects p ON q.project_id = p.project_id
      JOIN weeks w ON p.week_id = w.week_id
      WHERE q.quiz_id = ${quiz_id}
        AND w.module = ANY(${modules})
      LIMIT 1
    `;
    
    if (quiz.length === 0) {
      return res.status(403).json({ 
        message: 'You do not have access to this quiz' 
      });
    }
    
    req.enrolledModules = modules;
    next();
  } catch (error) {
    console.error('Error in checkQuizAccess:', error);
    res.status(500).json({ message: 'Error verifying quiz access', error: error.message });
  }
}


