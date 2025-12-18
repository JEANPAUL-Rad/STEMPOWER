// import * as ProgressModel from '../../models/admin/progress.model.js';

// // POST /progress
// export async function create(req, res) {
//   try {
//     const { user_id, lesson_id, completed, completed_at } = req.body;
//     if (!user_id || !lesson_id) {
//       return res.status(400).json({ message: "user_id and lesson_id required" });
//     }
//     const progress = await ProgressModel.createProgress({
//       user_id, lesson_id, completed, completed_at
//     });
//     res.status(201).json(progress);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }

// // GET /progress (with pagination)
// export async function list(req, res) {
//   try {
//     const { user_id, lesson_id } = req.query;
//     const limit = Number(req.query.limit) || 50;
//     const offset = Number(req.query.offset) || 0;
    
//     const progress = await ProgressModel.listProgress({ user_id, lesson_id, limit, offset });
//     res.json({
//       success: true,
//       data: progress,
//       pagination: {
//         limit,
//         offset,
//         count: progress.length
//       }
//     });
//   } catch (err) {
//     console.error('Error listing progress:', err);
//     res.status(500).json({ 
//       success: false,
//       message: err.message 
//     });
//   }
// }

// // GET /progress/:progress_id
// export async function get(req, res) {
//   try {
//     const progress = await ProgressModel.getProgressById(req.params.progress_id);
//     if (!progress) return res.status(404).json({ message: "Not found" });
//     res.json(progress);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }

// // PUT /progress/:progress_id
// export async function update(req, res) {
//   try {
//     const progress = await ProgressModel.updateProgress(req.params.progress_id, req.body);
//     if (!progress) return res.status(404).json({ message: "Not found" });
//     res.json(progress);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }

// // DELETE /progress/:progress_id
// export async function remove(req, res) {
//   try {
//     await ProgressModel.deleteProgress(req.params.progress_id);
//     res.json({ message: "Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }

import * as ProgressModel from '../../models/admin/progress.model.js';


// POST /progress
export async function create(req, res) {
 try {
   const { user_id, lesson_id, completed, completed_at } = req.body;
   if (!user_id || !lesson_id) {
     return res.status(400).json({ message: "user_id and lesson_id required" });
   }
   const progress = await ProgressModel.createProgress({
     user_id, lesson_id, completed, completed_at
   });
   res.status(201).json(progress);
 } catch (err) {
   res.status(500).json({ message: err.message });
 }
}


// GET /progress
export async function list(req, res) {
 try {
   const { user_id, lesson_id, limit, offset } = req.query;


   const userId = user_id !== undefined ? Number(user_id) : undefined;
   const lessonId = lesson_id !== undefined ? Number(lesson_id) : undefined;
   const limitNum = limit !== undefined ? Number(limit) : 20;
   const offsetNum = offset !== undefined ? Number(offset) : 0;


   if (userId !== undefined && !Number.isFinite(userId)) {
     return res.status(400).json({ message: 'user_id must be a number' });
   }
   if (lessonId !== undefined && !Number.isFinite(lessonId)) {
     return res.status(400).json({ message: 'lesson_id must be a number' });
   }
   if (!Number.isFinite(limitNum) || limitNum < 1) {
     return res.status(400).json({ message: 'limit must be a positive number' });
   }
   if (!Number.isFinite(offsetNum) || offsetNum < 0) {
     return res.status(400).json({ message: 'offset must be a non-negative number' });
   }


   // Hard cap to avoid returning huge payloads in production.
   const cappedLimit = Math.min(Math.floor(limitNum), 200);
   const cappedOffset = Math.floor(offsetNum);


   const progress = await ProgressModel.listProgress({
     user_id: userId,
     lesson_id: lessonId,
     limit: cappedLimit,
     offset: cappedOffset,
   });
   res.json(progress);
 } catch (err) {
   res.status(500).json({ message: err.message });
 }
}


// GET /progress/:progress_id
export async function get(req, res) {
 try {
   const progress = await ProgressModel.getProgressById(req.params.progress_id);
   if (!progress) return res.status(404).json({ message: "Not found" });
   res.json(progress);
 } catch (err) {
   res.status(500).json({ message: err.message });
 }
}


// PUT /progress/:progress_id
export async function update(req, res) {
 try {
   const progress = await ProgressModel.updateProgress(req.params.progress_id, req.body);
   if (!progress) return res.status(404).json({ message: "Not found" });
   res.json(progress);
 } catch (err) {
   res.status(500).json({ message: err.message });
 }
}


// DELETE /progress/:progress_id
export async function remove(req, res) {
 try {
   await ProgressModel.deleteProgress(req.params.progress_id);
   res.json({ message: "Deleted" });
 } catch (err) {
   res.status(500).json({ message: err.message });
 }
}
