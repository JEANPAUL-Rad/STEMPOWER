
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { saveFile } from '../../utils/saveFile.js';
import * as ChoiceModel from '../../models/admin/quiz_choice.model.js';
import * as QuestionModel from '../../models/admin/quiz_question.model.js';

// Configure multer to use memory storage for Cloudinary
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and videos are allowed.'));
    }
  }
});

// File upload middleware
export const uploadFile = upload.single('file');

// POST /api/v1/admin/upload-file
export async function uploadQuestionFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    // Upload to Cloudinary and return URL
    const fileUrl = await saveFile(req.file);
    res.json({ file_url: fileUrl, original_name: req.file.originalname, size: req.file.size });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/v1/admin/quizzes/:quiz_id/questions
export async function getQuestions(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const questions = await QuestionModel.getQuizQuestions(req.params.quiz_id, limit, offset);
    const total = await QuestionModel.getQuizQuestionsCount(req.params.quiz_id);
    
    // Get choices for each question
    const questionsWithChoices = await Promise.all(
      questions.map(async (question) => {
        if (question.type === 'mcq') {
          const choices = await ChoiceModel.getQuestionChoices(question.question_id);
          return { ...question, choices };
        }
        return { ...question, choices: [] };
      })
    );
    
    res.json({
      questions: questionsWithChoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/v1/admin/quizzes/:quiz_id/questions
export async function addQuestion(req, res) {
  try {
    const { question_text, type, order_num, choices, file_url, text_answer } = req.body;
    
    
    if (!question_text) {
      return res.status(400).json({ message: "Question text required" });
    }

    // Validate MCQ has choices
    if (type === 'mcq' && (!choices || choices.length === 0)) {
      return res.status(400).json({ message: "Multiple choice questions must have at least one choice" });
    }

    // Create the question
    const question = await QuestionModel.createQuizQuestion({
      quiz_id: req.params.quiz_id,
      question_text,
      type,
      order_num,
      file_url: type === 'file_upload' ? file_url : null,
      text_answer: type === 'text' ? text_answer : null
    });

    // Add choices if it's MCQ
    if (type === 'mcq' && choices && choices.length > 0) {
      const createdChoices = await Promise.all(
        choices.map(choice => 
          ChoiceModel.createQuizChoice({
            question_id: question.question_id,
            choice_text: choice.choice_text,
            is_correct: choice.is_correct || false
          })
        )
      );
      question.choices = createdChoices;
    } else {
      question.choices = [];
    }

    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /api/v1/admin/quiz-questions/:question_id
export async function updateQuestion(req, res) {
  try {
    const { question_text, type, order_num, choices, file_url, text_answer } = req.body;
    
    // Update the question
    const updated = await QuestionModel.updateQuizQuestion(req.params.question_id, {
      question_text,
      type,
      order_num,
      file_url: type === 'file_upload' ? file_url : null,
      text_answer: type === 'text' ? text_answer : null
    });
    
    if (!updated) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Handle choices update for MCQ
    if (type === 'mcq' && choices) {
      // Delete existing choices
      await ChoiceModel.deleteQuestionChoices(req.params.question_id);
      
      // Create new choices
      if (choices.length > 0) {
        const createdChoices = await Promise.all(
          choices.map(choice => 
            ChoiceModel.createQuizChoice({
              question_id: req.params.question_id,
              choice_text: choice.choice_text,
              is_correct: choice.is_correct || false
            })
          )
        );
        updated.choices = createdChoices;
      } else {
        updated.choices = [];
      }
    } else {
      updated.choices = [];
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /api/v1/admin/quiz-questions/:question_id
export async function deleteQuestion(req, res) {
  try {
    await QuestionModel.deleteQuizQuestion(req.params.question_id);
    res.json({ message: "Question and its choices deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/v1/admin/quiz-questions/:question_id/choices
export async function addChoice(req, res) {
  try {
    const { choice_text, is_correct } = req.body;
    if (!choice_text) return res.status(400).json({ message: "Choice text required" });
    
    const choice = await ChoiceModel.createQuizChoice({
      question_id: req.params.question_id,
      choice_text,
      is_correct: is_correct || false
    });
    res.status(201).json(choice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /api/v1/admin/quiz-choices/:choice_id
export async function updateChoice(req, res) {
  try {
    const updated = await ChoiceModel.updateQuizChoice(
      req.params.choice_id,
      req.body
    );
    if (!updated) return res.status(404).json({ message: "Choice not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /api/v1/admin/quiz-choices/:choice_id
export async function deleteChoice(req, res) {
  try {
    await ChoiceModel.deleteQuizChoice(req.params.choice_id);
    res.json({ message: "Choice deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET all questions with choices
export async function getAllQuestions(req, res) {
  try {
    const questions = await QuestionModel.getAllQuizQuestions();

    // Optional: fetch choices for each question if you want to return them
    const questionsWithChoices = await Promise.all(
      questions.map(async (question) => {
        let choices = [];
        if (question.type === 'mcq') {
          choices = await ChoiceModel.getQuestionChoices(question.question_id);
        }
        return { ...question, choices };
      })
    );

    res.json({ questions: questionsWithChoices });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getAllChoices(req, res) {
  try {
    const choices = await ChoiceModel.getAllQuizChoices();
    res.json({ choices });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}



export async function getQuizChoiceById(req, res) {
  try {
    const { id } = req.params;

    // ✅ Call the function using the namespace
    const choice = await ChoiceModel.findQuizChoiceById(Number(id));

    if (!choice) {
      return res.status(404).json({ success: false, message: 'Quiz choice not found' });
    }

    res.json({ success: true, data: choice });
  } catch (error) {
    console.error('Error in getQuizChoiceById:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}