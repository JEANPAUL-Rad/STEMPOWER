import { createServer } from 'http';
import app from './app.js';
import { initializeWebSocket } from './services/websocketService.js';
import quizTimerService from './services/quizTimerService.js';
import { startAutoBlockJob } from './jobs/autoBlockJob.js';

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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

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