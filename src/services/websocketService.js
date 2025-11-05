// services/websocketService.js - NEW SERVICE
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as QuizModel from '../models/admin/quiz.model.js';

let io = null;

export function initializeWebSocket(server) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.user_id;
      socket.userRole = decoded.role;
      
      console.log(`WebSocket authenticated: User ${decoded.user_id} (${decoded.role})`);
      next();
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected via WebSocket`);

    // Handle student joining a quiz session
    socket.on('join_quiz_session', async (data) => {
      try {
        const { session_id } = data;
        
        // Verify the session belongs to this user
        const session = await QuizModel.getQuizSessionById(session_id);
        if (!session || session.user_id !== socket.userId) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }

        // Join the session room
        socket.sessionId = session_id;
        socket.join(`session_${session_id}`);
        socket.join(`quiz_${session.quiz_id}`);
        
        console.log(`User ${socket.userId} joined quiz session ${session_id}`);
        
        // Send current session status
        socket.emit('session_status', {
          session_id: session_id,
          time_remaining: calculateTimeRemaining(session),
          status: session.submitted_at ? 'completed' : 'active'
        });

        // Start sending time updates every second for this session
        startTimeUpdatesForSession(socket, session);
        
      } catch (error) {
        console.error('Error joining quiz session:', error);
        socket.emit('error', { message: 'Failed to join quiz session' });
      }
    });

    // Handle admin joining quiz monitoring
    socket.on('join_quiz_monitoring', async (data) => {
      try {
        if (socket.userRole !== 'admin') {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        const { quiz_id } = data;
        socket.join(`quiz_admin_${quiz_id}`);
        
        console.log(`Admin ${socket.userId} monitoring quiz ${quiz_id}`);
        
        // Send current quiz stats
        const stats = await QuizModel.getQuizLiveStats(quiz_id);
        socket.emit('quiz_stats_update', stats);
        
      } catch (error) {
        console.error('Error joining quiz monitoring:', error);
        socket.emit('error', { message: 'Failed to join quiz monitoring' });
      }
    });

    // Handle answer auto-save
    socket.on('save_answer', async (data) => {
      try {
        const { session_id, question_id, answer } = data;
        
        // Verify session ownership
        const session = await QuizModel.getQuizSessionById(session_id);
        if (!session || session.user_id !== socket.userId) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }

        // Update session data
        const currentData = typeof session.session_data === 'string' 
          ? JSON.parse(session.session_data) 
          : session.session_data;
        
        if (!currentData.answers) currentData.answers = {};
        currentData.answers[question_id] = {
          answer: answer,
          answered_at: new Date().toISOString()
        };

        await QuizModel.updateQuizSession(session_id, {
          session_data: currentData
        });

        // Confirm save to student
        socket.emit('answer_saved', { 
          question_id: question_id,
          timestamp: new Date().toISOString()
        });

        // Update admin monitoring if active
        updateQuizStatsForAdmins(session.quiz_id);
        
      } catch (error) {
        console.error('Error saving answer:', error);
        socket.emit('error', { message: 'Failed to save answer' });
      }
    });

    // Handle manual quiz submission
    socket.on('submit_quiz', async (data) => {
      try {
        const { session_id } = data;
        
        // Verify session ownership
        const session = await QuizModel.getQuizSessionById(session_id);
        if (!session || session.user_id !== socket.userId) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }

        if (session.submitted_at) {
          socket.emit('error', { message: 'Quiz already submitted' });
          return;
        }

        // Calculate final score
        const finalScore = await calculateSessionScore(session);

        // Submit the quiz
        await QuizModel.updateQuizSession(session_id, {
          submitted_at: new Date().toISOString(),
          auto_submitted: false,
          final_score: finalScore
        });

        // Notify student
        socket.emit('quiz_submitted', {
          session_id: session_id,
          final_score: finalScore,
          submitted_at: new Date().toISOString(),
          message: 'Quiz submitted successfully!'
        });

        // Update admin stats
        updateQuizStatsForAdmins(session.quiz_id);
        
        console.log(`User ${socket.userId} manually submitted quiz session ${session_id}`);
        
      } catch (error) {
        console.error('Error submitting quiz:', error);
        socket.emit('error', { message: 'Failed to submit quiz' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from WebSocket`);
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

// Start sending time updates for a specific session
function startTimeUpdatesForSession(socket, session) {
  const interval = setInterval(async () => {
    try {
      // Check if socket is still connected and in the session
      if (!socket.connected || !socket.sessionId) {
        clearInterval(interval);
        return;
      }

      // Get fresh session data
      const currentSession = await QuizModel.getQuizSessionById(session.session_id);
      if (!currentSession || currentSession.submitted_at) {
        clearInterval(interval);
        socket.emit('session_ended', { 
          message: 'Quiz session has ended',
          session_id: session.session_id 
        });
        return;
      }

      const timeRemaining = calculateTimeRemaining(currentSession);
      
      if (timeRemaining <= 0) {
        clearInterval(interval);
        // Session will be auto-submitted by the timer service
        return;
      }

      // Send time update
      socket.emit('time_update', {
        session_id: session.session_id,
        time_remaining: timeRemaining,
        timestamp: new Date().toISOString()
      });

      // Send warning at 5 minutes
      if (timeRemaining === 300) {
        socket.emit('time_warning', {
          message: '⚠️ 5 minutes remaining!',
          time_remaining: timeRemaining
        });
      }

      // Send final warning at 1 minute
      if (timeRemaining === 60) {
        socket.emit('time_warning', {
          message: '🚨 1 minute remaining!',
          time_remaining: timeRemaining
        });
      }
      
    } catch (error) {
      console.error('Error in time update:', error);
      clearInterval(interval);
    }
  }, 1000); // Update every second
}

// Calculate time remaining for a session
function calculateTimeRemaining(session) {
  try {
    const startTime = new Date(session.started_at);
    const now = new Date();
    const elapsedMinutes = (now - startTime) / (1000 * 60);
    
    // Get quiz details to check time limit
    // This is a simplified version - you might want to cache this
    const timeLimitMinutes = session.time_limit || 60; // Default to 60 minutes
    const remainingMinutes = timeLimitMinutes - elapsedMinutes;
    
    return Math.max(0, Math.floor(remainingMinutes * 60)); // Return seconds
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return 0;
  }
}

// Calculate session score (implement your scoring logic)
async function calculateSessionScore(session) {
  try {
    const sessionData = typeof session.session_data === 'string' 
      ? JSON.parse(session.session_data) 
      : session.session_data;
    
    if (!sessionData.answers) return 0;
    
    // Implement your actual scoring logic here
    // This is a placeholder
    const answeredCount = Object.keys(sessionData.answers).length;
    const totalQuestions = sessionData.total_questions || 1;
    
    return Math.round((answeredCount / totalQuestions) * 100);
  } catch (error) {
    console.error('Error calculating session score:', error);
    return 0;
  }
}

// Update quiz statistics for admin monitoring
async function updateQuizStatsForAdmins(quiz_id) {
  try {
    if (!io) return;
    
    const stats = await QuizModel.getQuizLiveStats(quiz_id);
    io.to(`quiz_admin_${quiz_id}`).emit('quiz_stats_update', stats);
  } catch (error) {
    console.error('Error updating quiz stats for admins:', error);
  }
}

// Broadcast message to specific quiz sessions
export function broadcastToQuizSessions(room, message) {
  if (!io) return;
  
  io.to(room).emit('broadcast', message);
}

// Get WebSocket instance
export function getIO() {
  return io;
}