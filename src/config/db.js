// config/db.js
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

// Only log queries in development mode or if DB_DEBUG is explicitly enabled
const shouldLogQueries = process.env.NODE_ENV === 'development' || process.env.DB_DEBUG === 'true';

const sql = postgres(connectionString, {
  debug: shouldLogQueries ? (conn, query, params) => {
    console.log('📦 Executing query:', query, params);
  } : false,
  ssl: 'require', // Optional, useful if you're using Supabase
});

// ==============================================
// TIMEZONE UTILITY FUNCTIONS FOR CAT (UTC+2)
// ==============================================

/**
 * Convert UTC date to CAT (Central Africa Time - UTC+2)
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {Date|null} - Date object in CAT timezone
 */
export const convertUTCToCAT = (utcDate) => {
  if (!utcDate) return null;
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return null;
    
    // Add 2 hours to convert UTC to CAT
    return new Date(date.getTime() + (2 * 60 * 60 * 1000));
  } catch (error) {
    console.error('Error converting UTC to CAT:', error);
    return null;
  }
};

/**
 * Convert CAT date to UTC for database storage
 * @param {string|Date} catDate - CAT date string or Date object
 * @returns {Date|null} - Date object in UTC timezone
 */
export const convertCATToUTC = (catDate) => {
  if (!catDate) return null;
  
  try {
    const date = new Date(catDate);
    if (isNaN(date.getTime())) return null;
    
    // Subtract 2 hours to convert CAT to UTC
    return new Date(date.getTime() - (2 * 60 * 60 * 1000));
  } catch (error) {
    console.error('Error converting CAT to UTC:', error);
    return null;
  }
};

/**
 * Get current time in CAT timezone
 * @returns {Date} - Current date/time in CAT
 */
export const getCurrentCATTime = () => {
  const now = new Date();
  return convertUTCToCAT(now);
};

/**
 * Get current time in UTC (for database storage)
 * @returns {Date} - Current date/time in UTC
 */
export const getCurrentUTCTime = () => {
  return new Date();
};

/**
 * Format CAT date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatCATDate = (date, options = {}) => {
  if (!date) return '';
  
  const catDate = typeof date === 'string' ? convertUTCToCAT(date) : date;
  if (!catDate) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC' // We're already in CAT, so use UTC to prevent double conversion
  };
  
  return catDate.toLocaleString('en-US', { ...defaultOptions, ...options });
};

/**
 * Check if a quiz is currently active based on CAT timezone
 * @param {Object} quiz - Quiz object with start_time and end_time (UTC)
 * @returns {boolean} - Whether quiz is active
 */
export const isQuizActive = (quiz) => {
  if (!quiz || !quiz.start_time || !quiz.end_time) return false;
  
  const nowCAT = getCurrentCATTime();
  const startTimeCAT = convertUTCToCAT(quiz.start_time);
  const endTimeCAT = convertUTCToCAT(quiz.end_time);
  
  if (!startTimeCAT || !endTimeCAT) return false;
  
  return nowCAT >= startTimeCAT && nowCAT <= endTimeCAT;
};

/**
 * Calculate time remaining for a quiz in seconds
 * @param {Object} quiz - Quiz object with start_time, end_time, and time_limit
 * @param {Date} startedAt - When user started the quiz (CAT time)
 * @returns {number} - Seconds remaining (0 if expired)
 */
export const calculateQuizTimeRemaining = (quiz, startedAt = null) => {
  if (!quiz) return 0;
  
  const nowCAT = getCurrentCATTime();
  const endTimeCAT = convertUTCToCAT(quiz.end_time);
  
  if (!endTimeCAT) return 0;
  
  let timeLeft;
  
  if (quiz.time_limit && quiz.time_limit > 0 && startedAt) {
    // Calculate based on time limit from start
    const elapsedMinutes = Math.floor((nowCAT - startedAt) / (1000 * 60));
    const remainingFromTimeLimit = (quiz.time_limit - elapsedMinutes) * 60;
    
    // Calculate remaining time until quiz end
    const remainingUntilEnd = Math.floor((endTimeCAT - nowCAT) / 1000);
    
    // Use the smaller of the two
    timeLeft = Math.min(remainingFromTimeLimit, remainingUntilEnd);
  } else {
    // No time limit or start time, just use quiz end time
    timeLeft = Math.floor((endTimeCAT - nowCAT) / 1000);
  }
  
  return Math.max(0, timeLeft);
};

/**
 * Validate quiz timing constraints
 * @param {Object} quiz - Quiz object
 * @param {number} timeTaken - Time taken in minutes
 * @returns {Object} - Validation result
 */
export const validateQuizTiming = (quiz, timeTaken) => {
  const result = {
    isValid: true,
    errors: []
  };
  
  // Check if quiz is active
  if (!isQuizActive(quiz)) {
    result.isValid = false;
    result.errors.push('Quiz is not currently active or has ended');
  }
  
  // Check time limit (with 1 minute grace period)
  if (quiz.time_limit && timeTaken > (quiz.time_limit + 1)) {
    result.isValid = false;
    result.errors.push(`Submission exceeds quiz time limit of ${quiz.time_limit} minutes`);
  }
  
  return result;
};

/**
 * Create a standardized database timestamp in UTC
 * @param {Date} catDate - Optional CAT date, defaults to current time
 * @returns {string} - ISO string in UTC for database storage
 */
export const createDBTimestamp = (catDate = null) => {
  const date = catDate ? convertCATToUTC(catDate) : getCurrentUTCTime();
  return date ? date.toISOString() : new Date().toISOString();
};

/**
 * Parse database timestamp and return CAT date
 * @param {string} dbTimestamp - UTC timestamp from database
 * @returns {Date|null} - Date object in CAT timezone
 */
export const parseDBTimestamp = (dbTimestamp) => {
  return convertUTCToCAT(dbTimestamp);
};

// ==============================================
// QUIZ-SPECIFIC UTILITY FUNCTIONS
// ==============================================

/**
 * Get quiz with CAT-formatted times
 * @param {number} quizId - Quiz ID
 * @returns {Object|null} - Quiz object with CAT times
 */
export const getQuizWithCATTimes = async (quizId) => {
  try {
    const result = await sql`
      SELECT * FROM quizzes WHERE quiz_id = ${quizId}
    `;
    
    if (result.length === 0) return null;
    
    const quiz = result[0];
    
    return {
      ...quiz,
      start_time_cat: convertUTCToCAT(quiz.start_time),
      end_time_cat: convertUTCToCAT(quiz.end_time),
      start_time_cat_formatted: formatCATDate(quiz.start_time),
      end_time_cat_formatted: formatCATDate(quiz.end_time)
    };
  } catch (error) {
    console.error('Error fetching quiz with CAT times:', error);
    return null;
  }
};

/**
 * Log timezone conversion for debugging
 * @param {string} operation - Operation description
 * @param {Date} utcDate - UTC date
 * @param {Date} catDate - CAT date
 */
export const logTimezoneConversion = (operation, utcDate, catDate) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🕒 [${operation}] UTC: ${utcDate?.toISOString()} → CAT: ${catDate?.toISOString()}`);
  }
};

export default sql;