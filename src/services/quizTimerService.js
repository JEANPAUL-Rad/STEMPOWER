// services/quizTimerService.js - NEW SERVICE
import * as QuizModel from '../models/admin/quiz.model.js';
import { broadcastToQuizSessions } from './websocketService.js'; // We'll create this

class QuizTimerService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 30000; // Check every 30 seconds
    this.timerInterval = null;
  }

  start() {
    if (this.isRunning) {
      console.log('Quiz timer service is already running');
      return;
    }

    console.log('Starting Quiz Timer Service...');
    this.isRunning = true;
    
    // Run immediately on start
    this.checkQuizStatuses();
    
    // Then run every 30 seconds
    this.timerInterval = setInterval(() => {
      this.checkQuizStatuses();
    }, this.checkInterval);
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
    console.log('Quiz Timer Service stopped');
  }

  async checkQuizStatuses() {
    try {
      await Promise.all([
        this.startScheduledQuizzes(),
        this.endActiveQuizzes(),
        this.handleExpiredSessions()
      ]);
    } catch (error) {
      console.error('Error in quiz status check:', error);
    }
  }

  async startScheduledQuizzes() {
    try {
      const quizzesToStart = await QuizModel.getQuizzesToStart();
      
      for (const quiz of quizzesToStart) {
        console.log(`Auto-starting quiz: ${quiz.title} (ID: ${quiz.quiz_id})`);
        
        await QuizModel.updateQuizStatus(quiz.quiz_id, 'active');
        
        // Broadcast to any connected students
        broadcastToQuizSessions(`quiz_${quiz.quiz_id}`, {
          type: 'QUIZ_STARTED',
          quiz_id: quiz.quiz_id,
          message: 'Quiz has started! You can now begin.',
          timestamp: new Date().toISOString()
        });
      }
      
      if (quizzesToStart.length > 0) {
        console.log(`Started ${quizzesToStart.length} scheduled quiz(es)`);
      }
    } catch (error) {
      console.error('Error starting scheduled quizzes:', error);
    }
  }

  async endActiveQuizzes() {
    try {
      const quizzesToEnd = await QuizModel.getQuizzesToEnd();
      
      for (const quiz of quizzesToEnd) {
        console.log(`Auto-ending quiz: ${quiz.title} (ID: ${quiz.quiz_id})`);
        
        // Get active sessions before ending
        const activeSessions = await QuizModel.getActiveQuizSessions(quiz.quiz_id);
        
        // End the quiz and auto-submit sessions
        await QuizModel.forceEndQuiz(quiz.quiz_id);
        
        // Broadcast to students
        broadcastToQuizSessions(`quiz_${quiz.quiz_id}`, {
          type: 'QUIZ_ENDED',
          quiz_id: quiz.quiz_id,
          message: 'Quiz time has ended. Your answers have been automatically submitted.',
          auto_submitted: true,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Auto-submitted ${activeSessions.length} active session(s) for quiz ${quiz.quiz_id}`);
      }
      
      if (quizzesToEnd.length > 0) {
        console.log(`Ended ${quizzesToEnd.length} quiz(es) and auto-submitted sessions`);
      }
    } catch (error) {
      console.error('Error ending active quizzes:', error);
    }
  }

  async handleExpiredSessions() {
    try {
      const expiredSessions = await QuizModel.getExpiredSessions();
      
      for (const session of expiredSessions) {
        console.log(`Auto-submitting expired session: ${session.session_id} (User: ${session.user_id})`);
        
        // Calculate final score (you'll need to implement this based on your scoring logic)
        const finalScore = await this.calculateSessionScore(session);
        
        // Auto-submit the session
        await QuizModel.updateQuizSession(session.session_id, {
          submitted_at: new Date().toISOString(),
          auto_submitted: true,
          final_score: finalScore
        });
        
        // Notify the specific student
        broadcastToQuizSessions(`session_${session.session_id}`, {
          type: 'SESSION_AUTO_SUBMITTED',
          session_id: session.session_id,
          message: 'Your quiz session has been automatically submitted due to time expiry.',
          final_score: finalScore,
          timestamp: new Date().toISOString()
        });
      }
      
      if (expiredSessions.length > 0) {
        console.log(`Auto-submitted ${expiredSessions.length} expired session(s)`);
      }
    } catch (error) {
      console.error('Error handling expired sessions:', error);
    }
  }

  async calculateSessionScore(session) {
    try {
      // This is a placeholder - implement your actual scoring logic
      const sessionData = typeof session.session_data === 'string' 
        ? JSON.parse(session.session_data) 
        : session.session_data;
      
      if (!sessionData.answers) return 0;
      
      // You'll need to implement actual scoring based on correct answers
      // For now, return a mock score
      const answeredCount = Object.keys(sessionData.answers).length;
      const totalQuestions = sessionData.total_questions || 1;
      
      return Math.round((answeredCount / totalQuestions) * 100);
    } catch (error) {
      console.error('Error calculating session score:', error);
      return 0;
    }
  }

  // Method to get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: new Date().toISOString()
    };
  }
}

// Create singleton instance
const quizTimerService = new QuizTimerService();

export default quizTimerService;