// src/controllers/admin/submission_answer.controller.js
import * as SubmissionAnswerModel from '../../models/admin/submission_answer.model.js';

// POST /submission-answers
export async function create(req, res) {
  try {
    const { submission_id, question_id, selected_choice_id, file_url, text_answer } = req.body;

    if (!submission_id || !question_id) {
      return res.status(400).json({ message: 'submission_id and question_id are required' });
    }

    const answer = await SubmissionAnswerModel.createSubmissionAnswer({
      submission_id,
      question_id,
      selected_choice_id,
      file_url,
      text_answer
    });

    res.status(201).json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /submission-answers
export async function list(req, res) {
  try {
    const { submission_id, question_id } = req.query;
    const answers = await SubmissionAnswerModel.listSubmissionAnswers({ submission_id, question_id });
    res.json(answers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /submission-answers/:answer_id
export async function get(req, res) {
  try {
    const answer = await SubmissionAnswerModel.getSubmissionAnswerById(req.params.answer_id);
    if (!answer) return res.status(404).json({ message: 'Not found' });
    res.json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /submission-answers/:answer_id
export async function update(req, res) {
  try {
    const answer = await SubmissionAnswerModel.updateSubmissionAnswer(req.params.answer_id, req.body);
    if (!answer) return res.status(404).json({ message: 'Not found' });
    res.json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /submission-answers/:answer_id
export async function remove(req, res) {
  try {
    await SubmissionAnswerModel.deleteSubmissionAnswer(req.params.answer_id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
