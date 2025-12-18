// config/db.js
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

// Only log queries in development mode or if DB_DEBUG is explicitly enabled
const shouldLogQueries = process.env.NODE_ENV === 'development' || process.env.DB_DEBUG === 'true';


let maxConnections;
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '10', 10); // seconds

// Validate connection string
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in environment variables!');
  throw new Error('DATABASE_URL environment variable is required');
}

// For pooler connections, use longer timeout (60s), otherwise 30s
const defaultConnectTimeout = connectionString.includes('.pooler.supabase.com') ? 60 : 30;
const connectTimeout = parseInt(process.env.DB_CONNECT_TIMEOUT || String(defaultConnectTimeout), 10);

// Log connection string info (without exposing sensitive data)
const connectionInfo = connectionString.match(/postgres(ql)?:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
if (connectionInfo) {
  const [, , user, , host, database] = connectionInfo;
  console.log(`📊 Database connection: ${user}@${host}/${database}`);
} else {
  console.warn('⚠️  Could not parse DATABASE_URL format');
}

// Check if using Supabase (pooler or direct connection)
let finalConnectionString = connectionString;
const isPooler = connectionString.includes('.pooler.supabase.com');
const isDirectSupabase = (connectionString.includes('supabase.com') || connectionString.includes('supabase.co')) && !isPooler;

if (isPooler) {
  // POOLER CONNECTION - Can use Transaction mode (port 6543)
  // Detect which port is being used
  const portMatch = connectionString.match(/:(\d+)\//);
  const port = portMatch ? portMatch[1] : null;
  
  if (port === '5432') {
    // Port 5432 = Session mode (VERY LIMITED - only 1-2 connections typically)
    // Automatically convert to Transaction mode (port 6543) for better connection pooling
    console.log('⚠️  Detected Pooler Session mode (port 5432) - automatically switching to Transaction mode (port 6543)');
    console.log('   This prevents "max clients reached" errors');
    
    // Replace port 5432 with 6543
    finalConnectionString = connectionString.replace(':5432/', ':6543/');
    
    // Add pgbouncer=true parameter for transaction mode
    const separator = finalConnectionString.includes('?') ? '&' : '?';
    finalConnectionString = `${finalConnectionString}${separator}pgbouncer=true`;
    
    console.log('✅ Switched to Pooler Transaction mode with pgbouncer=true');
  } else if (port === '6543') {
    // Port 6543 = Transaction mode (better for connection pooling)
    console.log('ℹ️  Using Supabase pooler in Transaction mode (port 6543)');
    // Add pgbouncer parameter for transaction mode
    if (!finalConnectionString.includes('pgbouncer=true')) {
      const separator = finalConnectionString.includes('?') ? '&' : '?';
      finalConnectionString = `${finalConnectionString}${separator}pgbouncer=true`;
      console.log('   Added pgbouncer=true parameter');
    }
  } else {
    // No port specified or different port
    console.log(`ℹ️  Using Supabase pooler (port: ${port || 'default'})`);
    // For transaction mode, ensure pgbouncer=true is set
    if (!finalConnectionString.includes('pgbouncer=true') && port !== '5432') {
      const separator = finalConnectionString.includes('?') ? '&' : '?';
      finalConnectionString = `${finalConnectionString}${separator}pgbouncer=true`;
      console.log('   Added pgbouncer=true parameter');
    }
  }
} else if (isDirectSupabase) {
  // DIRECT CONNECTION - Limited to 1-4 connections (no pgbouncer support)
  const portMatch = connectionString.match(/:(\d+)\//);
  const port = portMatch ? portMatch[1] : '5432';
  
  console.log('ℹ️  Using Supabase DIRECT connection (port ' + port + ')');
  console.log('⚠️  Direct connections are LIMITED (typically 1-4 max connections)');
  console.log('   Connection pool will be set to 2 to prevent "max clients reached" errors');
  console.log('💡 RECOMMENDED: Switch to Pooler connection for better performance:');
  console.log('   1. Go to Supabase Dashboard > Settings > Database');
  console.log('   2. Copy the "Connection Pooling" connection string');
  console.log('   3. Update DATABASE_URL in your .env file');
  console.log('   4. The pooler URL should contain ".pooler.supabase.com"');
  
  // Direct connections cannot use pgbouncer, so we keep the connection string as-is
  // But we'll set a very conservative connection pool limit
}

// Set max connections based on connection type
// - Direct Supabase: 1-2 connections (very limited)
// - Pooler Session mode (5432): 1-2 connections (very limited)
// - Pooler Transaction mode (6543): 3-5 connections (better)
if (!maxConnections) {
  if (isDirectSupabase) {
    // Direct connections are very limited (typically 1-4, but we use 2 to be safe)
    maxConnections = 2;
  } else {
    // Pooler connection
    const finalPortMatch = finalConnectionString.match(/:(\d+)\//);
    const finalPort = finalPortMatch ? finalPortMatch[1] : null;
    
    if (finalPort === '5432') {
      maxConnections = 2; // Pooler Session mode: very limited (1-2 connections)
    } else {
      maxConnections = 3; // Pooler Transaction mode: more flexible (3-5 connections)
    }
  }
  
  // Allow override via environment variable
  maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || String(maxConnections), 10);
}

console.log(`📊 Connection pool: max=${maxConnections}, idle_timeout=${idleTimeout}s, connect_timeout=${connectTimeout}s`);

// SSL configuration for Supabase
// - Pooler connections: need flexible SSL (rejectUnauthorized: false)
// - Direct connections: can use strict SSL (require)
const sslConfig = isPooler
  ? { rejectUnauthorized: false } // Pooler requires this for proper SSL handshake
  : 'require'; // Direct connections can use strict SSL

const sql = postgres(finalConnectionString, {
  debug: shouldLogQueries ? (conn, query, params) => {
    console.log('📦 Executing query:', query, params);
  } : false,
  ssl: sslConfig, // SSL configuration (flexible for pooler, strict for direct)
  max: maxConnections, // Maximum number of connections in the pool
  idle_timeout: idleTimeout, // Close idle connections after this many seconds
  connect_timeout: connectTimeout, // Connection timeout in seconds (increased)
  max_lifetime: 60 * 30, // Close connections after 30 minutes (prevents stale connections)
  prepare: false, // Disable prepared statements for better connection pool compatibility (required for pooler)
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL compatibility
  },
  connection: {
    application_name: 'e-learning-backend', // Identify connections in database
  },
  // Handle connection errors gracefully
  onnotice: () => {}, // Suppress notices
  // Error handler for connection pool exhaustion
  onparameter: () => {}, // Suppress parameter notices
});

// ==============================================
// CONNECTION POOL HEALTH CHECK
// ==============================================

/**
 * Check database connection health
 * @returns {Promise<boolean>} - True if connection is healthy
 */
export const checkConnectionHealth = async () => {
  try {
    const startTime = Date.now();
    await sql`SELECT 1`;
    const duration = Date.now() - startTime;
    console.log(`✅ Connection test successful (${duration}ms)`);
    return true;
  } catch (error) {
    console.error('❌ Database connection health check failed:', error.message);
    if (error.message?.includes('CONNECT_TIMEOUT')) {
      console.error('   This usually means:');
      console.error('   - Network connectivity issues');
      console.error('   - Firewall blocking the connection');
      console.error('   - Incorrect DATABASE_URL format');
      console.error('   - Supabase pooler might be temporarily unavailable');
      console.error('\n   Try:');
      console.error('   1. Verify your DATABASE_URL in .env file');
      console.error('   2. Check if you can reach the Supabase dashboard');
      console.error('   3. Try using the direct connection string (not pooler)');
      console.error('   4. Increase DB_CONNECT_TIMEOUT environment variable');
    }
    return false;
  }
};

/**
 * Gracefully handle connection pool errors
 * @param {Error} error - Database error
 * @returns {Object} - Formatted error response
 */
export const handleConnectionError = (error) => {
  if (error.code === 'CONNECT_TIMEOUT' || error.message?.includes('CONNECT_TIMEOUT')) {
    return {
      error: 'Database connection timeout',
      message: 'Unable to connect to database. Please check your DATABASE_URL and network connection.',
      retryable: true,
      code: 'CONNECT_TIMEOUT'
    };
  }
  
  if (error.message?.includes('max clients reached') || error.message?.includes('MaxClientsInSessionMode')) {
    return {
      error: 'Database connection pool exhausted',
      message: 'Too many concurrent connections. Please try again in a moment.',
      retryable: true,
      code: 'POOL_EXHAUSTED'
    };
  }
  
  return {
    error: 'Database error',
    message: error.message || 'An unexpected database error occurred',
    retryable: false,
    code: error.code || 'UNKNOWN'
  };
};

/**
 * Retry a database query with exponential backoff
 * @param {Function} queryFn - Async function that returns a query result
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delayMs - Initial delay in milliseconds (default: 1000)
 * @returns {Promise} - Query result
 */
export const retryQuery = async (queryFn, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      
      // Only retry on connection errors
      const isRetryable = error.code === 'CONNECT_TIMEOUT' || 
                         error.message?.includes('CONNECT_TIMEOUT') ||
                         error.message?.includes('max clients reached') ||
                         error.message?.includes('Connection terminated');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = delayMs * Math.pow(2, attempt);
      console.warn(`⚠️  Database query failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

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