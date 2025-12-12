import { createServer } from 'http';
import app from './app.js';
import { initializeWebSocket } from './services/websocketService.js';
import quizTimerService from './services/quizTimerService.js';
import { startAutoBlockJob } from './jobs/autoBlockJob.js';
import { checkConnectionHealth } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Handle unhandled promise rejections to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit gracefully for uncaught exceptions
  process.exit(1);
});

const server = createServer(app);

// Initialize WebSocket with the server
initializeWebSocket(server);

// Start quiz timer service (disabled by default; enable with QUIZ_TIMER_ENABLED=true)
if (process.env.QUIZ_TIMER_ENABLED === 'true') {
  console.log('Starting Quiz Timer Service...');
  quizTimerService.start();
} else {
  console.log('Quiz Timer Service is disabled (set QUIZ_TIMER_ENABLED=true to enable).');
}

// Start auto-block scheduler
startAutoBlockJob();

// Test database connection before starting server (with timeout)
async function startServer() {
  console.log('🔍 Testing database connection...');
  
  let isHealthy = false;
  let timedOut = false;
  
  try {
    // Set a timeout for the database check (10 seconds)
    const dbCheckPromise = checkConnectionHealth();
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, 10000); // 10 second timeout
    });
    
    const result = await Promise.race([dbCheckPromise, timeoutPromise]);
    isHealthy = result === true;
  } catch (error) {
    console.error('Database check error:', error.message);
    isHealthy = false;
  }
  
  if (!isHealthy) {
    if (timedOut) {
      console.warn('⚠️  Database connection check timed out after 10 seconds');
    } else {
      console.error('❌ Database connection failed! Please check:');
      console.error('   1. DATABASE_URL is set correctly in .env file');
      console.error('   2. Database server is accessible');
      console.error('   3. Network connection is stable');
      console.error('   4. If using Supabase, try using the pooler connection string');
    }
    console.error('\n⚠️  Server will start anyway, but database operations may fail.');
  } else {
    console.log('✅ Database connection successful!');
  }

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use!`);
      console.error('   To fix this:');
      console.error(`   1. Kill the process: lsof -ti:${PORT} | xargs kill -9`);
      console.error(`   2. Or use a different port: PORT=5001 npm start`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  quizTimerService.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  quizTimerService.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;