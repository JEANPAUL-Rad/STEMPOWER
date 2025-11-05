// utils/timezone.js - Comprehensive timezone utilities for CAT (Kigali) timezone
// CAT (Central Africa Time) = UTC+2

/**
 * Convert UTC datetime to CAT timezone
 * @param {string|Date} utcDateString - UTC datetime string or Date object
 * @returns {Date|null} - Date object in CAT timezone or null if invalid
 */
export const convertUTCToCAT = (utcDateString) => {
  if (!utcDateString) return null;
  
  try {
    const utcDate = new Date(utcDateString);
    if (isNaN(utcDate.getTime())) return null;
    
    // Convert UTC to CAT (UTC+2) by adding 2 hours
    const catDate = new Date(utcDate.getTime() + (2 * 60 * 60 * 1000));
    return catDate;
  } catch (error) {
    console.error('Error converting UTC to CAT:', error);
    return null;
  }
};

/**
 * Convert CAT datetime to UTC timezone
 * @param {string|Date} catDateString - CAT datetime string or Date object
 * @returns {string|null} - UTC datetime string in ISO format or null if invalid
 */
export const convertCATToUTC = (catDateString) => {
  if (!catDateString) return null;
  
  try {
    const catDate = new Date(catDateString);
    if (isNaN(catDate.getTime())) return null;
    
    // Convert CAT (UTC+2) to UTC by subtracting 2 hours
    const utcDate = new Date(catDate.getTime() - (2 * 60 * 60 * 1000));
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting CAT to UTC:', error);
    return null;
  }
};

/**
 * Format UTC datetime to CAT display format
 * @param {string|Date} utcDateString - UTC datetime string or Date object
 * @returns {string|null} - Formatted CAT datetime string or null if invalid
 */
export const formatCATDisplay = (utcDateString) => {
  if (!utcDateString) return null;
  
  try {
    const catDate = convertUTCToCAT(utcDateString);
    if (!catDate) return null;
    
    return catDate.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC' // Since we already converted, treat as UTC for display
    });
  } catch (error) {
    console.error('Error formatting CAT display:', error);
    return null;
  }
};

/**
 * Format UTC datetime to CAT display format with seconds
 * @param {string|Date} utcDateString - UTC datetime string or Date object
 * @returns {string|null} - Formatted CAT datetime string with seconds or null if invalid
 */
export const formatCATDisplayWithSeconds = (utcDateString) => {
  if (!utcDateString) return null;
  
  try {
    const catDate = convertUTCToCAT(utcDateString);
    if (!catDate) return null;
    
    return catDate.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  } catch (error) {
    console.error('Error formatting CAT display with seconds:', error);
    return null;
  }
};

/**
 * Convert UTC datetime to CAT for datetime-local input
 * @param {string|Date} utcDateString - UTC datetime string or Date object  
 * @returns {string|null} - Formatted string for datetime-local input or null if invalid
 */
export const convertUTCToCATForInput = (utcDateString) => {
  if (!utcDateString) return '';
  
  try {
    const catDate = convertUTCToCAT(utcDateString);
    if (!catDate) return '';
    
    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    const year = catDate.getFullYear();
    const month = String(catDate.getMonth() + 1).padStart(2, '0');
    const day = String(catDate.getDate()).padStart(2, '0');
    const hours = String(catDate.getHours()).padStart(2, '0');
    const minutes = String(catDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error converting UTC to CAT for input:', error);
    return '';
  }
};

/**
 * Get current CAT datetime
 * @returns {Date} - Current datetime in CAT timezone
 */
export const getCurrentCAT = () => {
  const utcNow = new Date();
  return convertUTCToCAT(utcNow);
};

/**
 * Get minimum datetime for frontend input (current CAT + buffer minutes)
 * @param {number} bufferMinutes - Buffer minutes to add (default: 5)
 * @returns {string} - Formatted string for datetime-local input minimum value
 */
export const getMinCATDateTime = (bufferMinutes = 5) => {
  const currentCAT = getCurrentCAT();
  const minDateTime = new Date(currentCAT.getTime() + (bufferMinutes * 60 * 1000));
  
  const year = minDateTime.getFullYear();
  const month = String(minDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(minDateTime.getDate()).padStart(2, '0');
  const hours = String(minDateTime.getHours()).padStart(2, '0');
  const minutes = String(minDateTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Check if a UTC datetime is in the past (CAT timezone)
 * @param {string|Date} utcDateString - UTC datetime to check
 * @param {number} bufferMinutes - Buffer minutes for tolerance (default: 2)
 * @returns {boolean} - True if the datetime is in the past
 */
export const isUTCDateTimeInPastCAT = (utcDateString, bufferMinutes = 2) => {
  if (!utcDateString) return false;
  
  try {
    const utcDate = new Date(utcDateString);
    const currentUTC = new Date();
    const bufferTime = bufferMinutes * 60 * 1000;
    
    return utcDate.getTime() < (currentUTC.getTime() - bufferTime);
  } catch (error) {
    console.error('Error checking if UTC datetime is in past:', error);
    return false;
  }
};

/**
 * Log timezone conversion for debugging
 * @param {string} operation - Description of the operation
 * @param {string|Date} input - Input datetime
 * @param {string|Date} output - Output datetime
 */
export const logTimezoneConversion = (operation, input, output) => {
  console.log(`Timezone Conversion - ${operation}:`);
  console.log(`  Input:  ${input}`);
  console.log(`  Output: ${output}`);
  console.log('---');
};

/**
 * Validate time range in CAT timezone
 * @param {string} startTimeCAT - Start time in CAT
 * @param {string} endTimeCAT - End time in CAT
 * @param {number} minDifferenceMinutes - Minimum difference in minutes (default: 5)
 * @returns {object} - Validation result with isValid and message
 */
export const validateCATTimeRange = (startTimeCAT, endTimeCAT, minDifferenceMinutes = 5) => {
  try {
    if (!startTimeCAT || !endTimeCAT) {
      return { isValid: false, message: 'Both start time and end time are required' };
    }
    
    const startDate = new Date(startTimeCAT);
    const endDate = new Date(endTimeCAT);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { isValid: false, message: 'Invalid datetime format' };
    }
    
    if (startDate >= endDate) {
      return { isValid: false, message: 'Start time must be before end time' };
    }
    
    const timeDifference = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (timeDifference < minDifferenceMinutes) {
      return { 
        isValid: false, 
        message: `End time must be at least ${minDifferenceMinutes} minutes after start time` 
      };
    }
    
    return { isValid: true, message: 'Time range is valid' };
  } catch (error) {
    return { isValid: false, message: 'Error validating time range' };
  }
};

/**
 * Add timezone information to quiz objects for frontend display
 * @param {object|array} quizData - Single quiz object or array of quiz objects
 * @returns {object|array} - Quiz data with added CAT timezone fields
 */
export const addCATTimesToQuiz = (quizData) => {
  const addCATFields = (quiz) => ({
    ...quiz,
    start_time_cat: quiz.start_time ? convertUTCToCAT(quiz.start_time)?.toISOString() : null,
    end_time_cat: quiz.end_time ? convertUTCToCAT(quiz.end_time)?.toISOString() : null,
    start_time_cat_formatted: formatCATDisplay(quiz.start_time),
    end_time_cat_formatted: formatCATDisplay(quiz.end_time),
    start_time_cat_input: convertUTCToCATForInput(quiz.start_time),
    end_time_cat_input: convertUTCToCATForInput(quiz.end_time)``
  });
  
  if (Array.isArray(quizData)) {
    return quizData.map(addCATFields);
  } else {
    return addCATFields(quizData);
  }
};