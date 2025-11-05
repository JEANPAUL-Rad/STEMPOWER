import * as QuizSubmissionModel from '../../models/admin/quiz_submission.model.js';

// POST /quiz-submissions
export async function create(req, res) {
  try {
    const { quiz_id, user_id, submitted_at, score, admin_comment, reviewed } = req.body;
    if (!quiz_id || !user_id) {
      return res.status(400).json({ message: "quiz_id and user_id required" });
    }
    const submission = await QuizSubmissionModel.createQuizSubmission({
      quiz_id, user_id, submitted_at, score, admin_comment, reviewed
    });
    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /quiz-submissions
// Update your list function in quiz_submission.controller.js
export async function list(req, res) {
  try {
    console.log('Quiz submissions request received');
    console.log('Authorization header:', req.headers.authorization);
    console.log('User from token:', req.user);
    
    const { quiz_id, user_id } = req.query;
    const submissions = await QuizSubmissionModel.listQuizSubmissions({ quiz_id, user_id });
    
    console.log('Found submissions:', submissions.length);
    res.json(submissions);
  } catch (err) {
    console.error('Error in quiz submissions list:', err);
    res.status(500).json({ message: err.message });
  }
}

// GET /quiz-submissions/:submission_id
export async function get(req, res) {
  try {
    const submission = await QuizSubmissionModel.getQuizSubmissionById(req.params.submission_id);
    if (!submission) return res.status(404).json({ message: "Not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /quiz-submissions/:submission_id
export async function update(req, res) {
  try {
    const submission = await QuizSubmissionModel.updateQuizSubmission(req.params.submission_id, req.body);
    if (!submission) return res.status(404).json({ message: "Not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /quiz-submissions/:submission_id
export async function remove(req, res) {
  try {
    await QuizSubmissionModel.deleteQuizSubmission(req.params.submission_id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
