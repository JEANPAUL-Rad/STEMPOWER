import bcrypt from 'bcrypt';
import sql from '../config/db.js';
import { createEnrollment } from '../models/enrollment.model.js';
import { getUserEnrolledModules } from '../utils/enrollment.js';

// Helper function to normalize module names for matching
function normalizeModule(module) {
    if (!module) return null;
    const normalized = module.trim();
    // Map common variations to standard names
    const lower = normalized.toLowerCase();
    if (lower.includes('electrical') && !lower.includes('plumbing')) {
        return 'Electrical Design';
    }
    if (lower.includes('plumbing') || lower.includes('mechanical') || lower.includes('hvac')) {
        return 'Plumbing & Mechanical Design (HVAC)';
    }
    if (lower.includes('mep')) {
        return 'MEP Design';
    }
    return normalized;
}

// 1. Weeks & Projects
export async function getWeeks(user_id) {
    try {
        // Get user's enrolled modules
        const modules = await getUserEnrolledModules(user_id);
        
        // If no enrollments, return empty array
        if (!modules || modules.length === 0 || !modules[0]) {
            console.log(`⚠️ No enrolled modules for user ${user_id}`);
            return [];
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        const isMEP = normalizedModule === 'MEP Design';
        console.log(`📚 Fetching weeks for user ${user_id} with module: "${userModule}"`);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        const weeks = isMEP
            ? await sql`
                SELECT w.*
                FROM weeks w
                ORDER BY w.order_num NULLS LAST, w.week_id ASC
              `
            : await sql`
                SELECT w.*
                FROM weeks w
                WHERE w.module IS NOT NULL 
                  AND w.module != ''
                  AND (
                      LOWER(TRIM(w.module)) = ${userModuleLower}
                      OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                      OR w.module = ${userModule}
                      OR w.module = ${normalizedModule}
                  )
                ORDER BY w.order_num NULLS LAST, w.week_id ASC
              `;
        
        console.log(`✅ Found ${weeks.length} weeks for module "${userModule}"`);
        
        // Debug: Log all weeks if no matches found
        if (weeks.length === 0) {
            const allWeeks = await sql`SELECT week_id, title, module, order_num FROM weeks ORDER BY week_id LIMIT 20`;
            const allModules = await sql`SELECT DISTINCT module FROM weeks WHERE module IS NOT NULL`;
            console.log(`🔍 DEBUG: Available weeks in database (first 20):`);
            allWeeks.forEach(w => {
                console.log(`   Week ${w.week_id}: "${w.title}" | Module: "${w.module || 'NULL'}"`);
            });
            console.log(`🔍 Available modules in weeks:`, allModules.map(m => m.module));
            console.log(`🔍 User module: "${userModule}" | Normalized: "${normalizedModule}"`);
        }
        
        return weeks;
    } catch (error) {
        console.error('Error in getWeeks:', error);
        console.error('Error details:', error.stack);
        return [];
    }
}



export async function getProjectsByWeek(week_id, user_id) {
    try {
        // Verify user has access to this week
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            throw new Error('No active course enrollment found');
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Check if week belongs to a module the user has access to
        const isMEP = normalizedModule === 'MEP Design';
        const week = isMEP
            ? await sql`
                SELECT w.* FROM weeks w
                WHERE w.week_id = ${week_id}
                LIMIT 1
              `
            : await sql`
                SELECT w.* FROM weeks w
                WHERE w.week_id = ${week_id}
                  AND w.module IS NOT NULL 
                  AND w.module != ''
                  AND (
                      LOWER(TRIM(w.module)) = ${userModuleLower}
                      OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                      OR w.module = ${userModule}
                      OR w.module = ${normalizedModule}
                  )
                LIMIT 1
              `;
        
        if (week.length === 0) {
            throw new Error('You do not have access to this course');
        }
        
        const projects = await sql`SELECT * FROM projects WHERE week_id = ${week_id} ORDER BY order_num;`;
        
        // Return image URLs as-is (Cloudinary URLs or null)
        return projects.map(project => ({
            ...project,
            image_url: project.image_url || null
        }));
    } catch (error) {
        console.error('Error in getProjectsByWeek:', error);
        throw error;
    }
}


export async function getProjectDetails(project_id, user_id) {
    try {
        // Verify user has access to this project
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            throw new Error('No active course enrollment found');
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Check if project belongs to a module the user can access
        const isMEP = normalizedModule === 'MEP Design';
        const projects = isMEP
            ? await sql`
                SELECT p.* FROM projects p
                WHERE p.project_id = ${project_id}
              `
            : await sql`
                SELECT p.* FROM projects p
                JOIN weeks w ON p.week_id = w.week_id
                WHERE p.project_id = ${project_id}
                  AND w.module IS NOT NULL 
                  AND w.module != ''
                  AND (
                      LOWER(TRIM(w.module)) = ${userModuleLower}
                      OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                      OR w.module = ${userModule}
                      OR w.module = ${normalizedModule}
                  )
              `;
        
        if (projects.length === 0) {
            throw new Error('You do not have access to this project');
        }
        
        const project = projects[0];
        
        // Keep image URL as-is (Cloudinary URL or null)
        // No need to modify project.image_url
        
        project.lessons = await getLessonsByProject(project_id);
        return project;
    } catch (error) {
        console.error('Error in getProjectDetails:', error);
        throw error;
    }
}



export async function getAllProjects(user_id) {
    try {
        // Get user's enrolled modules
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            console.log(`⚠️ No enrolled modules for user ${user_id} in getAllProjects`);
            return [];
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        console.log(`📁 Fetching projects for user ${user_id} with module: "${userModule}"`);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Filter projects by enrolled modules
        let projects = (normalizedModule === 'MEP Design')
            ? await sql`
                SELECT
                    p.*,
                    w.title as week_title,
                    w.order_num as week_order,
                    w.module as week_module,
                    COUNT(l.lesson_id) as total_lessons,
                    COUNT(CASE WHEN pr.completed = true THEN 1 END) as completed_lessons,
                    CASE
                        WHEN COUNT(l.lesson_id) > 0 THEN
                            ROUND((COUNT(CASE WHEN pr.completed = true THEN 1 END) * 100.0 / COUNT(l.lesson_id)), 2)
                        ELSE 0
                    END as completion_percentage
                FROM projects p
                JOIN weeks w ON p.week_id = w.week_id
                LEFT JOIN lessons l ON p.project_id = l.project_id
                LEFT JOIN progress pr ON l.lesson_id = pr.lesson_id AND pr.user_id = ${user_id}
                GROUP BY p.project_id, w.title, w.order_num, w.module
                ORDER BY w.order_num, p.order_num;
              `
            : await sql`
                SELECT
                    p.*,
                    w.title as week_title,
                    w.order_num as week_order,
                    w.module as week_module,
                    COUNT(l.lesson_id) as total_lessons,
                    COUNT(CASE WHEN pr.completed = true THEN 1 END) as completed_lessons,
                    CASE
                        WHEN COUNT(l.lesson_id) > 0 THEN
                            ROUND((COUNT(CASE WHEN pr.completed = true THEN 1 END) * 100.0 / COUNT(l.lesson_id)), 2)
                        ELSE 0
                    END as completion_percentage
                FROM projects p
                JOIN weeks w ON p.week_id = w.week_id
                LEFT JOIN lessons l ON p.project_id = l.project_id
                LEFT JOIN progress pr ON l.lesson_id = pr.lesson_id AND pr.user_id = ${user_id}
                WHERE w.module IS NOT NULL 
                  AND w.module != ''
                  AND (
                      LOWER(TRIM(w.module)) = ${userModuleLower}
                      OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                      OR w.module = ${userModule}
                      OR w.module = ${normalizedModule}
                  )
                GROUP BY p.project_id, w.title, w.order_num, w.module
                ORDER BY w.order_num, p.order_num;
              `;
        
        console.log(`✅ Found ${projects.length} projects for module "${userModule}"`);
        
        // Debug if no projects found
        if (projects.length === 0) {
            const allProjectsWithWeeks = await sql`
                SELECT p.project_id, p.title, w.module, w.title as week_title 
                FROM projects p 
                JOIN weeks w ON p.week_id = w.week_id 
                LIMIT 10
            `;
            console.log(`🔍 Available projects in database:`, allProjectsWithWeeks);
        }
        
        // Return image URLs as-is (Cloudinary URLs or null)
        return projects.map(project => ({
            ...project,
            image_url: project.image_url || null
        }));
    } catch (error) {
        console.error('Error in getAllProjects:', error);
        return [];
    }
}

export async function getLessonsByProject(project_id, user_id = null) {
    // If user_id is provided, verify project belongs to user's module (safety check)
    if (user_id) {
        const modules = await getUserEnrolledModules(user_id);
        if (modules && modules.length > 0 && modules[0]) {
            const userModule = modules[0];
            const normalizedModule = normalizeModule(userModule);
            
            // Simple module matching (case-insensitive)
            const userModuleLower = (userModule || '').toLowerCase().trim();
            const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
            
            // Verify project belongs to a module the user can access
            const projectCheck = (normalizedModule === 'MEP Design')
                ? await sql`
                    SELECT p.project_id FROM projects p
                    WHERE p.project_id = ${project_id}
                    LIMIT 1
                  `
                : await sql`
                    SELECT p.project_id FROM projects p
                    JOIN weeks w ON p.week_id = w.week_id
                    WHERE p.project_id = ${project_id}
                      AND w.module IS NOT NULL 
                      AND w.module != ''
                      AND (
                          LOWER(TRIM(w.module)) = ${userModuleLower}
                          OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                          OR w.module = ${userModule}
                          OR w.module = ${normalizedModule}
                      )
                    LIMIT 1
                  `;
            
            if (projectCheck.length === 0) {
                throw new Error('You do not have access to lessons in this project');
            }
        }
    }
    
    const lessons = await sql`
        SELECT
            l.*,
            COALESCE(file_data.files, '[]'::json) AS files_json,
            file_data.file_url AS primary_file_url,
            file_data.image_url AS primary_image_url,
            file_data.video_url AS primary_video_url
        FROM lessons l
        LEFT JOIN LATERAL (
            SELECT
                json_agg(
                    json_build_object(
                        'file_id', lf.file_id,
                        'file_url', lf.file_url,
                        'file_name', lf.file_name,
                        'file_type', lf.file_type,
                        'file_size_bytes', lf.file_size_bytes,
                        'uploaded_at', lf.uploaded_at
                    )
                    ORDER BY lf.uploaded_at
                ) AS files,
                MIN(CASE
                      WHEN lf.file_type IS NULL
                        OR (lf.file_type NOT LIKE 'image/%' AND lf.file_type NOT LIKE 'video/%')
                      THEN lf.file_url
                    END) AS file_url,
                MIN(CASE
                      WHEN lf.file_type LIKE 'image/%'
                        OR lf.file_type = 'image/remote'
                      THEN lf.file_url
                    END) AS image_url,
                MIN(CASE
                      WHEN lf.file_type LIKE 'video/%'
                        OR lf.file_type = 'text/url'
                      THEN lf.file_url
                    END) AS video_url
            FROM lesson_files lf
            WHERE lf.lesson_id = l.lesson_id
        ) AS file_data ON TRUE
        WHERE l.project_id = ${project_id}
        ORDER BY l.order_num ASC NULLS FIRST, l.created_at ASC
    `;

    return lessons.map(({
        files_json,
        primary_file_url,
        primary_image_url,
        primary_video_url,
        ...lesson
    }) => ({
        ...lesson,
        file_url: lesson.file_url || primary_file_url || null,
        upload_image: lesson.upload_image || primary_image_url || null,
        video_url: lesson.video_url || primary_video_url || null,
        files: files_json
    }));
}

export async function getLessonDetails(lesson_id) {
    const lessons = await sql`
        SELECT
            l.*,
            COALESCE(file_data.files, '[]'::json) AS files_json,
            file_data.file_url AS primary_file_url,
            file_data.image_url AS primary_image_url,
            file_data.video_url AS primary_video_url
        FROM lessons l
        LEFT JOIN LATERAL (
            SELECT
                json_agg(
                    json_build_object(
                        'file_id', lf.file_id,
                        'file_url', lf.file_url,
                        'file_name', lf.file_name,
                        'file_type', lf.file_type,
                        'file_size_bytes', lf.file_size_bytes,
                        'uploaded_at', lf.uploaded_at
                    )
                    ORDER BY lf.uploaded_at
                ) AS files,
                MIN(CASE
                      WHEN lf.file_type IS NULL
                        OR (lf.file_type NOT LIKE 'image/%' AND lf.file_type NOT LIKE 'video/%')
                      THEN lf.file_url
                    END) AS file_url,
                MIN(CASE
                      WHEN lf.file_type LIKE 'image/%'
                        OR lf.file_type = 'image/remote'
                      THEN lf.file_url
                    END) AS image_url,
                MIN(CASE
                      WHEN lf.file_type LIKE 'video/%'
                        OR lf.file_type = 'text/url'
                      THEN lf.file_url
                    END) AS video_url
            FROM lesson_files lf
            WHERE lf.lesson_id = l.lesson_id
        ) AS file_data ON TRUE
        WHERE l.lesson_id = ${lesson_id}
        LIMIT 1
    `;
    if (lessons.length === 0) return null;
    const {
        files_json,
        primary_file_url,
        primary_image_url,
        primary_video_url,
        ...lesson
    } = lessons[0];
    return {
        ...lesson,
        file_url: lesson.file_url || primary_file_url || null,
        upload_image: lesson.upload_image || primary_image_url || null,
        video_url: lesson.video_url || primary_video_url || null,
        files: files_json
    };
}

// 3. Mark Lesson Complete
export async function markLessonComplete(user_id, lesson_id) {
    const [lesson] = await sql`
        SELECT 
            l.lesson_id,
            COALESCE(l.module, p.module, w.module) AS effective_module
        FROM lessons l
        LEFT JOIN projects p ON l.project_id = p.project_id
        LEFT JOIN weeks w ON p.week_id = w.week_id
        WHERE l.lesson_id = ${lesson_id}
        LIMIT 1
    `;

    if (!lesson) {
        throw new Error('Lesson not found');
    }

    const modules = await getUserEnrolledModules(user_id);
    if (!modules || modules.length === 0 || !modules[0]) {
        throw new Error('No active course enrollment found');
    }

    const userModule = modules[0];
    const normalizedModule = normalizeModule(userModule);
    const isMEP = normalizedModule === 'MEP Design';

    if (lesson.effective_module && !isMEP) {
        const lessonModuleNormalized = normalizeModule(lesson.effective_module);
        const lessonModuleLower = (lessonModuleNormalized || '').toLowerCase().trim();
        const userModuleLower = (normalizedModule || '').toLowerCase().trim();
        if (
            lessonModuleLower &&
            lessonModuleLower !== userModuleLower &&
            lesson.effective_module !== userModule &&
            lessonModuleNormalized !== normalizedModule
        ) {
            throw new Error('You do not have access to this lesson');
        }
    }

    await sql`
        INSERT INTO progress (user_id, lesson_id, completed, completed_at)
        SELECT ${user_id}, ${lesson_id}, true, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM progress WHERE user_id = ${user_id} AND lesson_id = ${lesson_id}
        )
    `;

    await sql`
        UPDATE progress
        SET completed = true, completed_at = NOW()
        WHERE user_id = ${user_id} AND lesson_id = ${lesson_id}
    `;
}

// 4. Quizzes

export async function getQuizDetails(quiz_id, user_id) {
    try {
        // Verify user has access to this quiz
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            throw new Error('No active course enrollment found');
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Join via lesson or project and enforce access via module field
        const quizzes = await sql`
            SELECT 
                q.*,
                CASE 
                    WHEN qs.submission_id IS NOT NULL THEN 'completed'
                    ELSE 'not_attempted'
                END as status
            FROM quizzes q
            LEFT JOIN lessons l ON q.lesson_id = l.lesson_id
            LEFT JOIN projects p_q ON q.project_id = p_q.project_id
            LEFT JOIN projects p_l ON l.project_id = p_l.project_id
            JOIN weeks w ON COALESCE(p_q.week_id, p_l.week_id) = w.week_id
            LEFT JOIN quiz_submissions qs ON q.quiz_id = qs.quiz_id AND qs.user_id = ${user_id}
            WHERE q.quiz_id = ${quiz_id}
              AND w.module IS NOT NULL 
              AND w.module != ''
              AND (
                  LOWER(TRIM(w.module)) = ${userModuleLower}
                  OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                  OR w.module = ${userModule}
                  OR w.module = ${normalizedModule}
              )
        `;
        
        if (!quizzes.length) {
            throw new Error('You do not have access to this quiz');
        }
        
        const quiz = quizzes[0];
        quiz.questions = await sql`SELECT * FROM quiz_questions WHERE quiz_id = ${quiz_id} ORDER BY order_num;`;
        
        for (const q of quiz.questions) {
            if (q.type === 'mcq') {
                q.choices = await sql`SELECT * FROM quiz_choices WHERE question_id = ${q.question_id} ORDER BY order_num;`;
            }
        }
        
        return quiz;
    } catch (error) {
        console.error('Error in getQuizDetails:', error);
        throw error;
    }
}

// UPDATE the existing submitQuiz function to prevent duplicates:
export async function submitQuiz(quizId, userId, answers) {
    return await sql.begin(async sql => {
        // Check if already submitted
        const existingSubmission = await sql`
            SELECT submission_id 
            FROM quiz_submissions 
            WHERE quiz_id = ${quizId} AND user_id = ${userId}
        `;
        
        if (existingSubmission.length > 0) {
            throw new Error('Quiz has already been submitted by this user');
        }

        const submission = await sql`
            INSERT INTO quiz_submissions (quiz_id, user_id, submitted_at)
            VALUES (${quizId}, ${userId}, CURRENT_TIMESTAMP)
            RETURNING submission_id
        `;

        const submissionId = submission[0].submission_id;

        for (const answer of answers) {
            await sql`
                INSERT INTO submission_answers (
                    submission_id,
                    question_id,
                    selected_choice_id,
                    text_answer,
                    file_url
                )
                VALUES (
                    ${submissionId},
                    ${answer.question_id},
                    ${answer.selected_choice_id},
                    ${answer.text_answer},
                    ${answer.file_url}
                )
            `;
        }

        return { submission_id: submissionId };
    });
}
export async function checkQuizSubmissionExists(quiz_id, user_id) {
    const result = await sql`
        SELECT submission_id 
        FROM quiz_submissions 
        WHERE quiz_id = ${quiz_id} AND user_id = ${user_id}
        LIMIT 1
    `;
    return result.length > 0;
}

export async function getQuizHistory(user_id) {
    const submissions = await sql`
            SELECT 
                s.*,
                q.title AS quiz_title, 
                q.project_id,
                q.description as quiz_description
            FROM quiz_submissions s
            JOIN quizzes q ON s.quiz_id = q.quiz_id
            WHERE s.user_id = ${user_id}
            ORDER BY s.submitted_at DESC
        `;

    for (const sub of submissions) {
        // Get answers with question details
        sub.answers = await sql`
                SELECT
                    sa.*,
                    qq.question_text,
                    qq.type as question_type
                FROM submission_answers sa
                JOIN quiz_questions qq ON sa.question_id = qq.question_id
                WHERE sa.submission_id = ${sub.submission_id}
                ORDER BY qq.order_num
            `;

        // Get choices for MCQ questions
        for (const answer of sub.answers) {
            if (answer.question_type === 'mcq') {
                answer.original_choices = await sql`
                        SELECT choice_id, choice_text, is_correct
                        FROM quiz_choices
                        WHERE question_id = ${answer.question_id}
                        ORDER BY order_num
                    `;
            }
        }
    }

    return submissions;
}

export async function updateQuizSubmissionGrade(submission_id, overall_score, status, answersFeedback) {
    await sql.begin(async sql => {
        if (overall_score !== undefined || status !== undefined) {
            let updateParts = [];
            if (overall_score !== undefined) {
                updateParts.push(`overall_score = ${sql.value(overall_score)}`);
            }
            if (status !== undefined) {
                updateParts.push(`status = ${sql.value(status)}`);
            }
            if (updateParts.length > 0) {
                await sql`
                        UPDATE quiz_submissions
                        SET ${sql.join(updateParts, sql`, `)}
                        WHERE submission_id = ${submission_id}
                    `;
            }
        }

        if (answersFeedback && Array.isArray(answersFeedback)) {
            for (const feedback of answersFeedback) {
                const { question_id, is_correct, feedback_text } = feedback;
                if (question_id) {
                    await sql`
                            UPDATE submission_answers
                            SET
                                is_correct = ${is_correct !== undefined ? is_correct : null},
                                feedback_text = ${feedback_text !== undefined ? feedback_text : null}
                            WHERE submission_id = ${submission_id} AND question_id = ${question_id}
                        `;
                }
            }
        }
    });
}


//     const rows = await sql`
//     SELECT
//       p.project_id,
//       p.title AS project_title,
//       q.quiz_id,
//       q.title AS quiz_title,
//       q.description
//     FROM projects p
//     LEFT JOIN quizzes q ON p.project_id = q.project_id
//     ORDER BY p.order_num, q.quiz_id
//   `;

//     // Group by project
//     const result = {};
//     for (const row of rows) {
//         if (!result[row.project_id]) {
//             result[row.project_id] = {
//                 project_id: row.project_id,
//                 project_title: row.project_title,
//                 quizzes: [],
//             };
//         }
//         if (row.quiz_id) {
//             result[row.project_id].quizzes.push({
//                 quiz_id: row.quiz_id,
//                 title: row.quiz_title,
//                 description: row.description
//             });
//         }
//     }
//     return Object.values(result);
// }



// 5. Progress
export async function getAllProjectQuizzes(user_id) {
    try {
        // Get user's enrolled modules
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            console.log(`⚠️ No enrolled modules for user ${user_id} in getAllProjectQuizzes`);
            return [];
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        console.log(`📝 Fetching quizzes for user ${user_id} with module: "${userModule}"`);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Filter quizzes by enrolled modules
        const rows = await sql`
        SELECT
          p.project_id,
          p.title AS project_title,
          q.quiz_id,
          q.title AS quiz_title,
          q.description,
          q.start_time,
          q.end_time,
          q.time_limit,
          CASE 
            WHEN qs.submission_id IS NOT NULL THEN 'completed'
            ELSE 'not_attempted'
          END as status
        FROM projects p
        JOIN weeks w ON p.week_id = w.week_id
        LEFT JOIN quizzes q ON p.project_id = q.project_id
        LEFT JOIN quiz_submissions qs ON q.quiz_id = qs.quiz_id AND qs.user_id = ${user_id}
        WHERE w.module IS NOT NULL 
          AND w.module != ''
          AND (
              LOWER(TRIM(w.module)) = ${userModuleLower}
              OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
              OR w.module = ${userModule}
              OR w.module = ${normalizedModule}
          )
        ORDER BY p.order_num, q.quiz_id
      `;
      
      console.log(`✅ Found ${rows.length} quiz rows for module "${userModule}"`);

        // Group by project
        const result = {};
        for (const row of rows) {
            if (!result[row.project_id]) {
                result[row.project_id] = {
                    project_id: row.project_id,
                    project_title: row.project_title,
                    quizzes: [],
                };
            }
            if (row.quiz_id) {
                result[row.project_id].quizzes.push({
                    quiz_id: row.quiz_id,
                    title: row.quiz_title,
                    description: row.description,
                    start_time: row.start_time,
                    end_time: row.end_time,
                    time_limit: row.time_limit,
                    status: row.status
                });
            }
        }
        return Object.values(result);
    } catch (error) {
        console.error('Error in getAllProjectQuizzes:', error);
        return [];
    }
}
export async function getProgress(user_id) {
    try {
        // Get user's enrolled modules
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            return { completed_lessons: [] };
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Filter progress by module field
        const completed = await sql`
            SELECT pr.lesson_id 
            FROM progress pr
            JOIN lessons l ON pr.lesson_id = l.lesson_id
            JOIN projects p ON l.project_id = p.project_id
            JOIN weeks w ON p.week_id = w.week_id
            WHERE pr.user_id = ${user_id} 
                AND pr.completed = true
                AND w.module IS NOT NULL 
                AND w.module != ''
                AND (
                    LOWER(TRIM(w.module)) = ${userModuleLower}
                    OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                    OR w.module = ${userModule}
                    OR w.module = ${normalizedModule}
                )
        `;
        return { completed_lessons: completed.map(l => l.lesson_id) };
    } catch (error) {
        console.error('Error in getProgress:', error);
        return { completed_lessons: [] };
    }
}

// Helper: get the user's primary module, mirroring getMyDashboard logic
export async function getUserPrimaryModule(user_id) {
    // STEP 1: Get user's email from users table
    const userInfo = await sql`
        SELECT email FROM users WHERE user_id = ${user_id} LIMIT 1
    `;
    const userEmail = userInfo.length > 0 ? userInfo[0].email : null;

    // STEP 2: Try active enrollments (with register join)
    let enrolledModulesDetails = [];
    try {
        enrolledModulesDetails = await sql`
            SELECT 
                COALESCE(r.module, e.module) as module,
                e.enrolled_at,
                e.status,
                r.id as registration_id,
                r.module as registration_module,
                e.module as enrollment_module,
                r.payment_status
            FROM enrollments e
            LEFT JOIN register r ON e.registration_id = r.id
            WHERE e.user_id = ${user_id} AND e.status = 'active'
            ORDER BY e.enrolled_at DESC
            LIMIT 1
        `;
    } catch (err) {
        console.error('Error fetching enrollments in getUserPrimaryModule:', err);
    }

    // STEP 3: If no active enrollment, fall back to register table
    if (enrolledModulesDetails.length === 0 && userEmail) {
        try {
            enrolledModulesDetails = await sql`
                SELECT 
                    r.module,
                    r.created_at as enrolled_at,
                    'pending' as status,
                    r.id as registration_id,
                    r.module as registration_module,
                    r.module as enrollment_module,
                    r.payment_status
                FROM register r
                WHERE r.user_id = ${user_id} AND r.module IS NOT NULL
                ORDER BY r.created_at DESC
                LIMIT 1
            `;

            if (enrolledModulesDetails.length === 0) {
                enrolledModulesDetails = await sql`
                    SELECT 
                        r.module,
                        r.created_at as enrolled_at,
                        'pending' as status,
                        r.id as registration_id,
                        r.module as registration_module,
                        r.module as enrollment_module,
                        r.payment_status
                    FROM register r
                    WHERE r.email_address = ${userEmail} AND r.module IS NOT NULL
                    ORDER BY r.created_at DESC
                    LIMIT 1
                `;
            }
        } catch (err) {
            console.error('Error fetching register data in getUserPrimaryModule:', err);
        }
    }

    if (enrolledModulesDetails.length === 0) {
        return null;
    }

    const primary = enrolledModulesDetails[0];
    return primary.registration_module || primary.module || primary.enrollment_module || null;
}

// 6. Resources
export async function getResources(type, user_id) {
    try {
        // Use the same primary module detection as the dashboard
        const userModule = await getUserPrimaryModule(user_id);
        
        // If no module, return empty (no access)
        if (!userModule || typeof userModule !== 'string') {
            console.log(`⚠️ No primary module for user ${user_id} in getResources - returning empty set`);
            return [];
        }
        const normalizedModule = normalizeModule(userModule);
        console.log(`📚 Fetching resources for user ${user_id} with module: "${userModule}"`);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        const isMEP = normalizedModule === 'MEP Design';
        const whereClause = isMEP
            ? sql`WHERE 1=1`
            : sql`
                WHERE (
                    -- Public resources are always visible
                    r.is_public = true
                    OR (
                        -- Resources explicitly tagged with a module
                        r.module IS NOT NULL 
                        AND r.module != ''
                        AND (
                            LOWER(TRIM(r.module)) = ${userModuleLower}
                            OR LOWER(TRIM(r.module)) = ${normalizedModuleLower}
                            OR r.module = ${userModule}
                            OR r.module = ${normalizedModule}
                        )
                    )
                    OR (
                        -- Resources linked to a week whose module matches the user
                        r.week_id IS NOT NULL
                        AND w.module IS NOT NULL
                        AND w.module != ''
                        AND (
                            LOWER(TRIM(w.module)) = ${userModuleLower}
                            OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                            OR w.module = ${userModule}
                            OR w.module = ${normalizedModule}
                        )
                    )
                )
            `;
        const typeClause = type ? sql` AND r.type = ${type}` : sql``;

        const resources = await sql`
            SELECT
                r.*,
                w.title AS week_title,
                w.order_num AS week_order,
                CASE 
                    WHEN r.is_public = true THEN 'public'
                    WHEN r.module IS NOT NULL AND r.module != '' THEN 'module_specific'
                    ELSE 'general'
                END AS resource_category,
                COALESCE(file_data.files, '[]'::json) AS files_json,
                file_data.file_url AS primary_file_url,
                file_data.image_url AS primary_image_url,
                file_data.video_url AS primary_video_url
            FROM resources r
            LEFT JOIN weeks w ON r.week_id = w.week_id
            LEFT JOIN LATERAL (
                SELECT
                    json_agg(
                        json_build_object(
                            'file_id', rf.file_id,
                            'file_url', rf.file_url,
                            'file_name', rf.file_name,
                            'file_type', rf.file_type,
                            'file_size_bytes', rf.file_size_bytes,
                            'uploaded_at', rf.uploaded_at
                        )
                        ORDER BY rf.uploaded_at
                    ) AS files,
                    MIN(CASE
                          WHEN rf.file_type IS NULL
                            OR (rf.file_type NOT LIKE 'image/%' AND rf.file_type NOT LIKE 'video/%')
                          THEN rf.file_url
                        END) AS file_url,
                    MIN(CASE
                          WHEN rf.file_type LIKE 'image/%'
                            OR rf.file_type = 'image/remote'
                          THEN rf.file_url
                        END) AS image_url,
                    MIN(CASE
                          WHEN rf.file_type LIKE 'video/%'
                            OR rf.file_type = 'text/url'
                          THEN rf.file_url
                        END) AS video_url
                FROM resource_files rf
                WHERE rf.resource_id = r.resource_id
            ) AS file_data ON TRUE
            ${whereClause}
            ${typeClause}
            ORDER BY COALESCE(w.order_num, 9999), r.created_at DESC
        `;

        console.log(`✅ Found ${resources.length} resources${type ? ` of type "${type}"` : ''} for module "${userModule}"`);

        return resources.map(({
            files_json,
            primary_file_url,
            primary_image_url,
            primary_video_url,
            ...resource
        }) => ({
            ...resource,
            file_url: resource.file_url || primary_file_url || null,
            image_url: resource.image_url || primary_image_url || null,
            video_url: resource.video_url || primary_video_url || null,
            files: files_json
        }));
    } catch (error) {
        console.error('Error in getResources:', error);
        // On error, return empty set to avoid leaking resources
        return [];
    }
}

// --- ADDED THIS NEW FUNCTION FOR RESOURCE DETAILS ---
export async function getResourceDetails(resource_id) {
    const resources = await sql`
        SELECT
            r.*,
            w.title AS week_title,
            w.order_num AS week_order,
            COALESCE(file_data.files, '[]'::json) AS files_json,
            file_data.file_url AS primary_file_url,
            file_data.image_url AS primary_image_url,
            file_data.video_url AS primary_video_url
        FROM resources r
        LEFT JOIN weeks w ON r.week_id = w.week_id
        LEFT JOIN LATERAL (
            SELECT
                json_agg(
                    json_build_object(
                        'file_id', rf.file_id,
                        'file_url', rf.file_url,
                        'file_name', rf.file_name,
                        'file_type', rf.file_type,
                        'file_size_bytes', rf.file_size_bytes,
                        'uploaded_at', rf.uploaded_at
                    )
                    ORDER BY rf.uploaded_at
                ) AS files,
                MIN(CASE
                      WHEN rf.file_type IS NULL
                        OR (rf.file_type NOT LIKE 'image/%' AND rf.file_type NOT LIKE 'video/%')
                      THEN rf.file_url
                    END) AS file_url,
                MIN(CASE
                      WHEN rf.file_type LIKE 'image/%'
                        OR rf.file_type = 'image/remote'
                      THEN rf.file_url
                    END) AS image_url,
                MIN(CASE
                      WHEN rf.file_type LIKE 'video/%'
                        OR rf.file_type = 'text/url'
                      THEN rf.file_url
                    END) AS video_url
            FROM resource_files rf
            WHERE rf.resource_id = r.resource_id
        ) AS file_data ON TRUE
        WHERE r.resource_id = ${resource_id}
        LIMIT 1
    `;
    if (resources.length === 0) return null;
    const {
        files_json,
        primary_file_url,
        primary_image_url,
        primary_video_url,
        ...resource
    } = resources[0];
    return {
        ...resource,
        file_url: resource.file_url || primary_file_url || null,
        image_url: resource.image_url || primary_image_url || null,
        video_url: resource.video_url || primary_video_url || null,
        files: files_json
    };
}
// ----------------------------------------------------


// 7. Dashboard Functions
export async function getCourses(user_id) {
    try {
        // Get user's enrolled modules
        const modules = await getUserEnrolledModules(user_id);
        
        // If no enrollments, return empty array
        if (!modules || modules.length === 0 || !modules[0]) {
            return [];
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Filter weeks by module field
        return await sql`
            SELECT
                week_id as course_id,
                title,
                description,
                order_num,
                created_at
            FROM weeks
            WHERE module IS NOT NULL 
              AND module != ''
              AND (
                  LOWER(TRIM(module)) = ${userModuleLower}
                  OR LOWER(TRIM(module)) = ${normalizedModuleLower}
                  OR module = ${userModule}
                  OR module = ${normalizedModule}
              )
            ORDER BY order_num;
        `;
    } catch (error) {
        console.error('Error in getCourses:', error);
        return [];
    }
}



export async function getProjectsByWeekDashboard(user_id) {
    try {
        // Get user's enrolled modules
        const modules = await getUserEnrolledModules(user_id);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            return [];
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Filter weeks by enrolled modules
        const isMEP = normalizedModule === 'MEP Design';
        const result = isMEP
            ? await sql`
                SELECT
                    w.week_id,
                    w.title as week_title,
                    w.order_num,
                    json_agg(
                        json_build_object(
                            'project_id', p.project_id,
                            'title', p.title,
                            'short_description', p.short_description,
                            'image_url', p.image_url,
                            'video_url', p.video_url,
                            'order_num', p.order_num,
                            'total_lessons', COALESCE(lesson_counts.total_lessons, 0),
                            'completed_lessons', COALESCE(lesson_counts.completed_lessons, 0),
                            'completion_percentage', COALESCE(lesson_counts.completion_percentage, 0)
                        )
                        ORDER BY p.order_num
                    ) as projects
                FROM weeks w
                LEFT JOIN projects p ON w.week_id = p.week_id
                LEFT JOIN (
                    SELECT
                        l.project_id,
                        COUNT(l.lesson_id) as total_lessons,
                        COUNT(CASE WHEN pr.completed = true THEN 1 END) as completed_lessons,
                        CASE
                            WHEN COUNT(l.lesson_id) > 0 THEN
                                ROUND((COUNT(CASE WHEN pr.completed = true THEN 1 END) * 100.0 / COUNT(l.lesson_id)), 2)
                            ELSE 0
                        END as completion_percentage
                    FROM lessons l
                    LEFT JOIN progress pr ON l.lesson_id = pr.lesson_id AND pr.user_id = ${user_id}
                    GROUP BY l.project_id
                ) lesson_counts ON p.project_id = lesson_counts.project_id
                GROUP BY w.week_id, w.title, w.order_num
                ORDER BY w.order_num;
              `
            : await sql`
                SELECT
                    w.week_id,
                    w.title as week_title,
                    w.order_num,
                    json_agg(
                        json_build_object(
                            'project_id', p.project_id,
                            'title', p.title,
                            'short_description', p.short_description,
                            'image_url', p.image_url,
                            'video_url', p.video_url,
                            'order_num', p.order_num,
                            'total_lessons', COALESCE(lesson_counts.total_lessons, 0),
                            'completed_lessons', COALESCE(lesson_counts.completed_lessons, 0),
                            'completion_percentage', COALESCE(lesson_counts.completion_percentage, 0)
                        )
                        ORDER BY p.order_num
                    ) as projects
                FROM weeks w
                LEFT JOIN projects p ON w.week_id = p.week_id
                LEFT JOIN (
                    SELECT
                        l.project_id,
                        COUNT(l.lesson_id) as total_lessons,
                        COUNT(CASE WHEN pr.completed = true THEN 1 END) as completed_lessons,
                        CASE
                            WHEN COUNT(l.lesson_id) > 0 THEN
                                ROUND((COUNT(CASE WHEN pr.completed = true THEN 1 END) * 100.0 / COUNT(l.lesson_id)), 2)
                            ELSE 0
                        END as completion_percentage
                    FROM lessons l
                    LEFT JOIN progress pr ON l.lesson_id = pr.lesson_id AND pr.user_id = ${user_id}
                    GROUP BY l.project_id
                ) lesson_counts ON p.project_id = lesson_counts.project_id
                WHERE w.module IS NOT NULL 
                  AND w.module != ''
                  AND (
                      LOWER(TRIM(w.module)) = ${userModuleLower}
                      OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                      OR w.module = ${userModule}
                      OR w.module = ${normalizedModule}
                  )
                GROUP BY w.week_id, w.title, w.order_num
                ORDER BY w.order_num;
              `;
        
        return result;
    } catch (error) {
        console.error('Error in getProjectsByWeekDashboard:', error);
        return [];
    }
}



export async function getRecentActivity(user_id, page = 1, limit = 10) {
    try {
        // Get user's enrolled modules FIRST
        const modules = await getUserEnrolledModules(user_id);
        
        // If no enrollments, return empty array
        if (modules.length === 0 || !modules[0]) {
            return [];
        }

        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        const offset = (page - 1) * limit;

        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();

        // Define the base query for activity - ONLY for enrolled modules
        const baseActivityQuery = sql`
            SELECT
                'lesson_completed' as activity_type,
                l.title as title,
                p.title as project_title,
                w.title as week_title,
                pr.completed_at as timestamp
            FROM progress pr
            JOIN lessons l ON pr.lesson_id = l.lesson_id
            JOIN projects p ON l.project_id = p.project_id
            JOIN weeks w ON p.week_id = w.week_id
            WHERE pr.user_id = ${user_id} 
                AND pr.completed = true
                AND w.module IS NOT NULL 
                AND w.module != ''
                AND (
                    LOWER(TRIM(w.module)) = ${userModuleLower}
                    OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                    OR w.module = ${userModule}
                    OR w.module = ${normalizedModule}
                )
            UNION ALL
            SELECT
                'quiz_submitted' as activity_type,
                q.title as title,
                p.title as project_title,
                w.title as week_title,
                qs.submitted_at as timestamp
            FROM quiz_submissions qs
            JOIN quizzes q ON qs.quiz_id = q.quiz_id
            JOIN projects p ON q.project_id = p.project_id
            JOIN weeks w ON p.week_id = w.week_id
            WHERE qs.user_id = ${user_id}
                AND w.module IS NOT NULL 
                AND w.module != ''
                AND (
                    LOWER(TRIM(w.module)) = ${userModuleLower}
                    OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                    OR w.module = ${userModule}
                    OR w.module = ${normalizedModule}
                )
        `;

        // Get paginated activity data
        const activities = await sql`
            ${baseActivityQuery}
            ORDER BY timestamp DESC
            LIMIT ${limit} OFFSET ${offset};
        `;

        // Return array directly (as expected by getMyDashboard)
        return activities || [];
    } catch (error) {
        console.error('Error in getRecentActivity:', error);
        return [];
    }
}


export async function getMyDashboard(user_id) {
    try {
        // STEP 1: Get user's email from users table
        const userInfo = await sql`
            SELECT email FROM users WHERE user_id = ${user_id} LIMIT 1
        `;
        const userEmail = userInfo.length > 0 ? userInfo[0].email : null;
        
        // STEP 2: Get user's enrolled modules from enrollments table
        const modules = await getUserEnrolledModules(user_id);
        
        // STEP 3: Get enrollment details OR registration details (fallback to register table)
        let enrolledModulesDetails = [];
        
        // First, try to get from enrollments table (preferred)
        // BUT also check if registration has a different (updated) module
        if (modules.length > 0) {
            enrolledModulesDetails = await sql`
                SELECT 
                    COALESCE(r.module, e.module) as module,
                    COALESCE(r.module, e.module) as module_title,
                    e.enrolled_at,
                    e.status,
                    r.id as registration_id,
                    r.full_name,
                    r.email_address,
                    r.payment_status,
                    r.payment_amount,
                    e.module as enrollment_module,
                    r.module as registration_module
                FROM enrollments e
                LEFT JOIN register r ON e.registration_id = r.id
                WHERE e.user_id = ${user_id} AND e.status = 'active'
                ORDER BY e.enrolled_at DESC
                LIMIT 1
            `;
            
            // If enrollment module differs from registration module, registration module is more recent
            if (enrolledModulesDetails.length > 0 && 
                enrolledModulesDetails[0].registration_module && 
                enrolledModulesDetails[0].enrollment_module &&
                enrolledModulesDetails[0].registration_module !== enrolledModulesDetails[0].enrollment_module) {
                console.log(`⚠️ Module mismatch detected: Enrollment has "${enrolledModulesDetails[0].enrollment_module}" but Registration has "${enrolledModulesDetails[0].registration_module}"`);
                console.log(`   Using registration module "${enrolledModulesDetails[0].registration_module}" as it's more recent`);
                // Update enrollment to match registration module if payment is Paid
                if (enrolledModulesDetails[0].payment_status === 'Paid') {
                    try {
                        // Cancel old enrollment
                        await sql`
                            UPDATE enrollments 
                            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                            WHERE enrollment_id IN (
                                SELECT enrollment_id FROM enrollments 
                                WHERE user_id = ${user_id} AND module = ${enrolledModulesDetails[0].enrollment_module} AND status = 'active'
                                LIMIT 1
                            )
                        `;
                        // Create new enrollment with registration module
                        await createEnrollment({
                            user_id: user_id,
                            registration_id: enrolledModulesDetails[0].registration_id,
                            module: enrolledModulesDetails[0].registration_module,
                            status: 'active'
                        });
                        console.log(`✅ Synced enrollment to match registration module "${enrolledModulesDetails[0].registration_module}"`);
                    } catch (syncErr) {
                        console.error('Error syncing enrollment module:', syncErr);
                    }
                }
            }
        }
        
        // STEP 4: If no enrollment found, check register table (registration exists but not enrolled yet)
        if (enrolledModulesDetails.length === 0 && userEmail) {
            // Try by user_id first
            enrolledModulesDetails = await sql`
                SELECT 
                    r.module,
                    r.module as module_title,
                    r.created_at as enrolled_at,
                    'pending' as status,
                    r.id as registration_id,
                    r.full_name,
                    r.email_address,
                    r.payment_status,
                    r.payment_amount
                FROM register r
                WHERE r.user_id = ${user_id} AND r.module IS NOT NULL
                ORDER BY r.created_at DESC
                LIMIT 1
            `;
            
            // If still not found, try by email (user registered before account creation)
            if (enrolledModulesDetails.length === 0) {
                enrolledModulesDetails = await sql`
                    SELECT 
                        r.module,
                        r.module as module_title,
                        r.created_at as enrolled_at,
                        'pending' as status,
                        r.id as registration_id,
                        r.full_name,
                        r.email_address,
                        r.payment_status,
                        r.payment_amount
                    FROM register r
                    WHERE r.email_address = ${userEmail} AND r.module IS NOT NULL
                    ORDER BY r.created_at DESC
                    LIMIT 1
                `;
                
                // If found by email, update register.user_id to link it
                if (enrolledModulesDetails.length > 0) {
                    await sql`
                        UPDATE register 
                        SET user_id = ${user_id} 
                        WHERE id = ${enrolledModulesDetails[0].registration_id}
                    `;
                    console.log(`✅ Linked registration ${enrolledModulesDetails[0].registration_id} to user ${user_id}`);
                }
            }
        }

        // If still no registration found, return empty dashboard
        if (enrolledModulesDetails.length === 0) {
            return {
                stats: {
                    total_projects: 0,
                    total_lessons: 0,
                    total_weeks: 0,
                    completed_lessons: 0,
                    quizzes_taken: 0,
                    completion_percentage: 0
                },
                current_progress: null,
                recent_activity: [],
                enrolled_modules: []
            };
        }

        // Ensure we have a valid module (prioritize registration module if available, then enrollment module)
        // This ensures we always use the most up-to-date module from registration
        const userModule = enrolledModulesDetails[0]?.registration_module || 
                          enrolledModulesDetails[0]?.module || 
                          enrolledModulesDetails[0]?.module_title || 
                          modules[0];
        if (!userModule) {
            return {
                stats: {
                    total_projects: 0,
                    total_lessons: 0,
                    total_weeks: 0,
                    completed_lessons: 0,
                    quizzes_taken: 0,
                    completion_percentage: 0
                },
                current_progress: null,
                recent_activity: [],
                enrolled_modules: []
            };
        }

        const normalizedModule = normalizeModule(userModule);
        const isMEP = normalizedModule === 'MEP Design';
        console.log(`📊 Fetching dashboard stats for user ${user_id}`);
        console.log(`   User module: "${userModule}"`);
        console.log(`   Normalized: "${normalizedModule}"`);
        console.log(`   isMEP: ${isMEP}`);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        // Debug: Check what modules exist in weeks table
        const availableModules = await sql`
            SELECT DISTINCT module, COUNT(*) as count 
            FROM weeks 
            WHERE module IS NOT NULL AND module != ''
            GROUP BY module
            LIMIT 10
        `;
        console.log(`🔍 Available modules in weeks table:`, availableModules.map(m => `${m.module} (${m.count} weeks)`));
        
        // Fetch stats
        // For normal modules, restrict to that module.
        // For MEP, aggregate across all modules (super-access).
        const overallStats = isMEP
            ? await sql`
                SELECT
                    COUNT(DISTINCT p.project_id) as total_projects,
                    COUNT(DISTINCT l.lesson_id) as total_lessons,
                    COUNT(DISTINCT w.week_id) as total_weeks
                FROM weeks w
                LEFT JOIN projects p ON w.week_id = p.week_id
                LEFT JOIN lessons l ON p.project_id = l.project_id
            `
            : await sql`
                SELECT
                    COUNT(DISTINCT p.project_id) as total_projects,
                    COUNT(DISTINCT l.lesson_id) as total_lessons,
                    COUNT(DISTINCT w.week_id) as total_weeks
                FROM weeks w
                LEFT JOIN projects p ON w.week_id = p.week_id
                LEFT JOIN lessons l ON p.project_id = l.project_id
                WHERE (
                    -- Weeks with matching module
                    (w.module IS NOT NULL 
                      AND w.module != ''
                      AND (
                          LOWER(TRIM(w.module)) = ${userModuleLower}
                          OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                          OR w.module = ${userModule}
                          OR w.module = ${normalizedModule}
                      ))
                    -- OR projects with direct module match
                    OR (p.module IS NOT NULL 
                      AND p.module != ''
                      AND (
                          LOWER(TRIM(p.module)) = ${userModuleLower}
                          OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                          OR p.module = ${userModule}
                          OR p.module = ${normalizedModule}
                      ))
                    -- OR lessons with direct module match
                    OR (l.module IS NOT NULL 
                      AND l.module != ''
                      AND (
                          LOWER(TRIM(l.module)) = ${userModuleLower}
                          OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                          OR l.module = ${userModule}
                          OR l.module = ${normalizedModule}
                      ))
                )
            `;

        // Fetch user-specific completed lessons
        // For MEP, count all completed lessons; for others, filter by module
        const userCompletedLessons = isMEP
            ? await sql`
                SELECT
                    COUNT(DISTINCT pr.lesson_id) as completed_lessons
                FROM progress pr
                WHERE pr.user_id = ${user_id} 
                  AND pr.completed = true
            `
            : await sql`
                SELECT
                    COUNT(DISTINCT pr.lesson_id) as completed_lessons
                FROM progress pr
                JOIN lessons l ON pr.lesson_id = l.lesson_id
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                WHERE pr.user_id = ${user_id} 
                    AND pr.completed = true
                    AND (
                        -- Lesson has direct module match
                        (l.module IS NOT NULL 
                          AND l.module != ''
                          AND (
                              LOWER(TRIM(l.module)) = ${userModuleLower}
                              OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                              OR l.module = ${userModule}
                              OR l.module = ${normalizedModule}
                          ))
                        -- OR lesson's project has module match
                        OR (p.module IS NOT NULL 
                          AND p.module != ''
                          AND (
                              LOWER(TRIM(p.module)) = ${userModuleLower}
                              OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                              OR p.module = ${userModule}
                              OR p.module = ${normalizedModule}
                          ))
                        -- OR lesson's week has module match
                        OR (w.module IS NOT NULL 
                          AND w.module != ''
                          AND (
                              LOWER(TRIM(w.module)) = ${userModuleLower}
                              OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                              OR w.module = ${userModule}
                              OR w.module = ${normalizedModule}
                          ))
                    )
            `;

        // Fetch user-specific quizzes taken
        // For MEP, include all quizzes; for others, filter by module
        const userQuizzesTaken = isMEP
            ? await sql`
                SELECT
                    COUNT(DISTINCT qs.submission_id) as quizzes_taken
                FROM quiz_submissions qs
                WHERE qs.user_id = ${user_id}
            `
            : await sql`
                SELECT
                    COUNT(DISTINCT qs.submission_id) as quizzes_taken
                FROM quiz_submissions qs
                JOIN quizzes q ON qs.quiz_id = q.quiz_id
                LEFT JOIN projects p ON q.project_id = p.project_id
                LEFT JOIN lessons l ON q.lesson_id = l.lesson_id
                LEFT JOIN projects p2 ON l.project_id = p2.project_id
                LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                WHERE qs.user_id = ${user_id}
                    AND (
                        -- Quiz has direct module match
                        (q.module IS NOT NULL 
                          AND q.module != ''
                          AND (
                              LOWER(TRIM(q.module)) = ${userModuleLower}
                              OR LOWER(TRIM(q.module)) = ${normalizedModuleLower}
                              OR q.module = ${userModule}
                              OR q.module = ${normalizedModule}
                          ))
                        -- OR quiz's project has module match
                        OR (p.module IS NOT NULL 
                          AND p.module != ''
                          AND (
                              LOWER(TRIM(p.module)) = ${userModuleLower}
                              OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                              OR p.module = ${userModule}
                              OR p.module = ${normalizedModule}
                          ))
                        -- OR quiz's lesson has module match
                        OR (l.module IS NOT NULL 
                          AND l.module != ''
                          AND (
                              LOWER(TRIM(l.module)) = ${userModuleLower}
                              OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                              OR l.module = ${userModule}
                              OR l.module = ${normalizedModule}
                          ))
                        -- OR quiz's lesson's project has module match
                        OR (p2.module IS NOT NULL 
                          AND p2.module != ''
                          AND (
                              LOWER(TRIM(p2.module)) = ${userModuleLower}
                              OR LOWER(TRIM(p2.module)) = ${normalizedModuleLower}
                              OR p2.module = ${userModule}
                              OR p2.module = ${normalizedModule}
                          ))
                        -- OR quiz's week has module match
                        OR (w.module IS NOT NULL 
                          AND w.module != ''
                          AND (
                              LOWER(TRIM(w.module)) = ${userModuleLower}
                              OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                              OR w.module = ${userModule}
                              OR w.module = ${normalizedModule}
                          ))
                    )
            `;

        // Combine results
        const statsResult = {
            total_projects: parseInt(overallStats[0]?.total_projects || 0),
            total_lessons: parseInt(overallStats[0]?.total_lessons || 0),
            total_weeks: parseInt(overallStats[0]?.total_weeks || 0),
            completed_lessons: parseInt(userCompletedLessons[0]?.completed_lessons || 0),
            quizzes_taken: parseInt(userQuizzesTaken[0]?.quizzes_taken || 0)
        };
        
        console.log(`📊 Dashboard stats result:`, statsResult);

        // Get current progress / next lesson
        // For MEP, pick the next incomplete lesson across all modules.
        // For others, restrict to the enrolled module as before.
        const currentProgress = isMEP
            ? await sql`
                SELECT
                    w.week_id,
                    w.title as current_week,
                    p.project_id,
                    p.title as current_project,
                    l.lesson_id as next_lesson_id,
                    l.title as next_lesson_title,
                    COUNT(l_all.lesson_id) as total_lessons_in_project,
                    COUNT(CASE WHEN pr_all.completed = true THEN 1 END) as completed_lessons_in_project
                FROM lessons l
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                LEFT JOIN progress pr ON l.lesson_id = pr.lesson_id AND pr.user_id = ${user_id}
                LEFT JOIN lessons l_all ON p.project_id = l_all.project_id
                LEFT JOIN progress pr_all ON l_all.lesson_id = pr_all.lesson_id AND pr_all.user_id = ${user_id}
                WHERE (pr.completed IS NULL OR pr.completed = false)
                GROUP BY w.week_id, w.title, p.project_id, p.title, l.lesson_id, l.title, l.order_num
                ORDER BY w.order_num, p.order_num, l.order_num
                LIMIT 1
            `
            : await sql`
                SELECT
                    w.week_id,
                    w.title as current_week,
                    p.project_id,
                    p.title as current_project,
                    l.lesson_id as next_lesson_id,
                    l.title as next_lesson_title,
                    COUNT(l_all.lesson_id) as total_lessons_in_project,
                    COUNT(CASE WHEN pr_all.completed = true THEN 1 END) as completed_lessons_in_project
                FROM lessons l
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                LEFT JOIN progress pr ON l.lesson_id = pr.lesson_id AND pr.user_id = ${user_id}
                LEFT JOIN lessons l_all ON p.project_id = l_all.project_id
                LEFT JOIN progress pr_all ON l_all.lesson_id = pr_all.lesson_id AND pr_all.user_id = ${user_id}
                WHERE (pr.completed IS NULL OR pr.completed = false)
                    AND (
                        -- Lesson has direct module match
                        (l.module IS NOT NULL 
                          AND l.module != ''
                          AND (
                              LOWER(TRIM(l.module)) = ${userModuleLower}
                              OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                              OR l.module = ${userModule}
                              OR l.module = ${normalizedModule}
                          ))
                        -- OR lesson's project has module match
                        OR (p.module IS NOT NULL 
                          AND p.module != ''
                          AND (
                              LOWER(TRIM(p.module)) = ${userModuleLower}
                              OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                              OR p.module = ${userModule}
                              OR p.module = ${normalizedModule}
                          ))
                        -- OR lesson's week has module match
                        OR (w.module IS NOT NULL 
                          AND w.module != ''
                          AND (
                              LOWER(TRIM(w.module)) = ${userModuleLower}
                              OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                              OR w.module = ${userModule}
                              OR w.module = ${normalizedModule}
                          ))
                    )
                GROUP BY w.week_id, w.title, p.project_id, p.title, l.lesson_id, l.title, l.order_num
                ORDER BY w.order_num, p.order_num, l.order_num
                LIMIT 1
            `;

        const recentActivity = await getRecentActivity(user_id);

        const completionPercentage = statsResult.total_lessons > 0
            ? Math.round((statsResult.completed_lessons / statsResult.total_lessons) * 100)
            : 0;

        // Get module statistics for each enrolled/registered module
        const modulesWithStats = await Promise.all(
            enrolledModulesDetails.map(async (module) => {
                try {
                    // Get the module name (prioritize registration module, then enrollment module)
                    const moduleName = module.registration_module || module.module || module.module_title;
                    
                    if (!moduleName) {
                        console.warn(`⚠️ No module name found for enrollment details:`, module);
                        return null;
                    }
                    
                    const normalizedModuleName = normalizeModule(moduleName);
                    
                    // Simple module matching (case-insensitive)
                    const moduleNameLower = (moduleName || '').toLowerCase().trim();
                    const normalizedModuleNameLower = (normalizedModuleName || '').toLowerCase().trim();
                    
                    console.log(`📊 Fetching stats for module: "${moduleName}" (normalized: "${normalizedModuleName}")`);
                    
                    // Enhanced query to get all content counts for the module
                    // Split into separate queries for better accuracy
                    const [weekStats, projectStats, lessonStats, quizStats, assignmentStats, resourceStats] = await Promise.all([
                        // Weeks count
                        sql`
                            SELECT COUNT(DISTINCT week_id) as total_weeks
                            FROM weeks
                            WHERE module IS NOT NULL 
                              AND module != ''
                              AND (
                                  LOWER(TRIM(module)) = ${moduleNameLower}
                                  OR LOWER(TRIM(module)) = ${normalizedModuleNameLower}
                                  OR module = ${moduleName}
                                  OR module = ${normalizedModuleName}
                              )
                        `,
                        // Projects count - check both direct module and weeks.module
                        sql`
                            SELECT COUNT(DISTINCT p.project_id) as total_projects
                            FROM projects p
                            LEFT JOIN weeks w ON p.week_id = w.week_id
                            WHERE (
                                -- Project has direct module match
                                (p.module IS NOT NULL 
                                  AND p.module != ''
                                  AND (
                                      LOWER(TRIM(p.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(p.module)) = ${normalizedModuleNameLower}
                                      OR p.module = ${moduleName}
                                      OR p.module = ${normalizedModuleName}
                                  ))
                                -- OR project's week has module match
                                OR (w.module IS NOT NULL 
                                  AND w.module != ''
                                  AND (
                                      LOWER(TRIM(w.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(w.module)) = ${normalizedModuleNameLower}
                                      OR w.module = ${moduleName}
                                      OR w.module = ${normalizedModuleName}
                                  ))
                            )
                        `,
                        // Lessons count - check lesson.module, project.module, and week.module
                        sql`
                            SELECT COUNT(DISTINCT l.lesson_id) as total_lessons
                            FROM lessons l
                            LEFT JOIN projects p ON l.project_id = p.project_id
                            LEFT JOIN weeks w ON p.week_id = w.week_id
                            WHERE (
                                -- Lesson has direct module match
                                (l.module IS NOT NULL 
                                  AND l.module != ''
                                  AND (
                                      LOWER(TRIM(l.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(l.module)) = ${normalizedModuleNameLower}
                                      OR l.module = ${moduleName}
                                      OR l.module = ${normalizedModuleName}
                                  ))
                                -- OR lesson's project has module match
                                OR (p.module IS NOT NULL 
                                  AND p.module != ''
                                  AND (
                                      LOWER(TRIM(p.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(p.module)) = ${normalizedModuleNameLower}
                                      OR p.module = ${moduleName}
                                      OR p.module = ${normalizedModuleName}
                                  ))
                                -- OR lesson's week has module match
                                OR (w.module IS NOT NULL 
                                  AND w.module != ''
                                  AND (
                                      LOWER(TRIM(w.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(w.module)) = ${normalizedModuleNameLower}
                                      OR w.module = ${moduleName}
                                      OR w.module = ${normalizedModuleName}
                                  ))
                            )
                        `,
                        // Quizzes count - check quiz.module directly plus relationships
                        sql`
                            SELECT COUNT(DISTINCT q.quiz_id) as total_quizzes
                            FROM quizzes q
                            LEFT JOIN projects p ON q.project_id = p.project_id
                            LEFT JOIN lessons l ON q.lesson_id = l.lesson_id
                            LEFT JOIN projects p2 ON l.project_id = p2.project_id
                            LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                            WHERE (
                                -- Quiz has direct module match
                                (q.module IS NOT NULL 
                                  AND q.module != ''
                                  AND (
                                      LOWER(TRIM(q.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(q.module)) = ${normalizedModuleNameLower}
                                      OR q.module = ${moduleName}
                                      OR q.module = ${normalizedModuleName}
                                  ))
                                -- OR quiz's project has module match
                                OR (p.module IS NOT NULL 
                                  AND p.module != ''
                                  AND (
                                      LOWER(TRIM(p.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(p.module)) = ${normalizedModuleNameLower}
                                      OR p.module = ${moduleName}
                                      OR p.module = ${normalizedModuleName}
                                  ))
                                -- OR quiz's lesson has module match
                                OR (l.module IS NOT NULL 
                                  AND l.module != ''
                                  AND (
                                      LOWER(TRIM(l.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(l.module)) = ${normalizedModuleNameLower}
                                      OR l.module = ${moduleName}
                                      OR l.module = ${normalizedModuleName}
                                  ))
                                -- OR quiz's lesson's project has module match
                                OR (p2.module IS NOT NULL 
                                  AND p2.module != ''
                                  AND (
                                      LOWER(TRIM(p2.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(p2.module)) = ${normalizedModuleNameLower}
                                      OR p2.module = ${moduleName}
                                      OR p2.module = ${normalizedModuleName}
                                  ))
                                -- OR quiz's week has module match
                                OR (w.module IS NOT NULL 
                                  AND w.module != ''
                                  AND (
                                      LOWER(TRIM(w.module)) = ${moduleNameLower}
                                      OR LOWER(TRIM(w.module)) = ${normalizedModuleNameLower}
                                      OR w.module = ${moduleName}
                                      OR w.module = ${normalizedModuleName}
                                  ))
                            )
                        `,
                        // Assignments count - check assignment.module directly plus relationships
                        sql`
                            SELECT COUNT(DISTINCT a.assignment_id) as total_assignments
                            FROM assignments a
                            LEFT JOIN projects p ON a.project_id = p.project_id
                            LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
                            LEFT JOIN projects p2 ON l.project_id = p2.project_id
                            LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                            WHERE a.is_active = true
                              AND (
                                  -- Assignment has direct module match
                                  (a.module IS NOT NULL 
                                    AND a.module != ''
                                    AND (
                                        LOWER(TRIM(a.module)) = ${moduleNameLower}
                                        OR LOWER(TRIM(a.module)) = ${normalizedModuleNameLower}
                                        OR a.module = ${moduleName}
                                        OR a.module = ${normalizedModuleName}
                                    ))
                                  -- OR assignment's project has module match
                                  OR (p.module IS NOT NULL 
                                    AND p.module != ''
                                    AND (
                                        LOWER(TRIM(p.module)) = ${moduleNameLower}
                                        OR LOWER(TRIM(p.module)) = ${normalizedModuleNameLower}
                                        OR p.module = ${moduleName}
                                        OR p.module = ${normalizedModuleName}
                                    ))
                                  -- OR assignment's lesson has module match
                                  OR (l.module IS NOT NULL 
                                    AND l.module != ''
                                    AND (
                                        LOWER(TRIM(l.module)) = ${moduleNameLower}
                                        OR LOWER(TRIM(l.module)) = ${normalizedModuleNameLower}
                                        OR l.module = ${moduleName}
                                        OR l.module = ${normalizedModuleName}
                                    ))
                                  -- OR assignment's lesson's project has module match
                                  OR (p2.module IS NOT NULL 
                                    AND p2.module != ''
                                    AND (
                                        LOWER(TRIM(p2.module)) = ${moduleNameLower}
                                        OR LOWER(TRIM(p2.module)) = ${normalizedModuleNameLower}
                                        OR p2.module = ${moduleName}
                                        OR p2.module = ${normalizedModuleName}
                                    ))
                                  -- OR assignment's week has module match
                                  OR (w.module IS NOT NULL 
                                    AND w.module != ''
                                    AND (
                                        LOWER(TRIM(w.module)) = ${moduleNameLower}
                                        OR LOWER(TRIM(w.module)) = ${normalizedModuleNameLower}
                                        OR w.module = ${moduleName}
                                        OR w.module = ${normalizedModuleName}
                                    ))
                              )
                        `,
                        // Resources count (direct module link)
                        sql`
                            SELECT COUNT(DISTINCT resource_id) as total_resources
                            FROM resources
                            WHERE module IS NOT NULL 
                              AND module != ''
                              AND (
                                  LOWER(TRIM(module)) = ${moduleNameLower}
                                  OR LOWER(TRIM(module)) = ${normalizedModuleNameLower}
                                  OR module = ${moduleName}
                                  OR module = ${normalizedModuleName}
                              )
                        `
                    ]);
                    
                    const moduleStats = [{
                        total_weeks: parseInt(weekStats[0]?.total_weeks || 0),
                        total_projects: parseInt(projectStats[0]?.total_projects || 0),
                        total_lessons: parseInt(lessonStats[0]?.total_lessons || 0),
                        total_quizzes: parseInt(quizStats[0]?.total_quizzes || 0),
                        total_assignments: parseInt(assignmentStats[0]?.total_assignments || 0),
                        total_resources: parseInt(resourceStats[0]?.total_resources || 0)
                    }];
                    
                    console.log(`📊 Stats for "${moduleName}":`, {
                        weeks: moduleStats[0]?.total_weeks || 0,
                        projects: moduleStats[0]?.total_projects || 0,
                        lessons: moduleStats[0]?.total_lessons || 0,
                        quizzes: moduleStats[0]?.total_quizzes || 0,
                        assignments: moduleStats[0]?.total_assignments || 0,
                        resources: moduleStats[0]?.total_resources || 0
                    });
                    
                    // If all stats are 0, log warning
                    if (moduleStats[0]?.total_weeks === 0 && moduleStats[0]?.total_projects === 0) {
                        console.warn(`⚠️ WARNING: Module "${moduleName}" has no content!`);
                        console.warn(`   This usually means weeks don't have this module assigned.`);
                        console.warn(`   Check weeks table: SELECT * FROM weeks WHERE module = '${moduleName}';`);
                    }
                    
                    // Normalize module name to exact values
                    let moduleTitle = module.module_title || module.module || moduleName;
                    const moduleLower = moduleTitle?.toLowerCase() || '';
                    
                    if (moduleLower.includes('electrical')) {
                        moduleTitle = 'Electrical Design';
                    } else if (moduleLower.includes('plumbing') || moduleLower.includes('mechanical') || moduleLower.includes('hvac')) {
                        moduleTitle = 'Plumbing & Mechanical Design (HVAC)';
                    } else if (moduleLower.includes('mep')) {
                        moduleTitle = 'MEP Design';
                    }
                    
                    return {
                        module: moduleName, // Keep original for queries
                        module_title: moduleTitle, // Normalized for display
                        enrolled_at: module.enrolled_at,
                        enrollment_status: module.status || (module.payment_status === 'Paid' ? 'active' : 'pending'),
                        payment_status: module.payment_status || 'Pending',
                        payment_amount: module.payment_amount || 0,
                        registration_id: module.registration_id || null,
                        module_stats: {
                            total_weeks: parseInt(moduleStats[0]?.total_weeks || 0),
                            total_projects: parseInt(moduleStats[0]?.total_projects || 0),
                            total_lessons: parseInt(moduleStats[0]?.total_lessons || 0),
                            total_quizzes: parseInt(moduleStats[0]?.total_quizzes || 0),
                            total_assignments: parseInt(moduleStats[0]?.total_assignments || 0),
                            total_resources: parseInt(moduleStats[0]?.total_resources || 0)
                        }
                    };
                } catch (error) {
                    const moduleName = module.module || module.module_title;
                    console.error(`Error fetching stats for module ${moduleName}:`, error);
                    
                    // Normalize module name even on error
                    let moduleTitle = module.module_title || module.module || moduleName || '';
                    const moduleLower = moduleTitle?.toLowerCase() || '';
                    
                    if (moduleLower.includes('electrical')) {
                        moduleTitle = 'Electrical Design';
                    } else if (moduleLower.includes('plumbing') || moduleLower.includes('mechanical') || moduleLower.includes('hvac')) {
                        moduleTitle = 'Plumbing & Mechanical Design (HVAC)';
                    } else if (moduleLower.includes('mep')) {
                        moduleTitle = 'MEP Design';
                    }
                    
                    return {
                        module: moduleName,
                        module_title: moduleTitle,
                        enrolled_at: module.enrolled_at,
                        enrollment_status: module.status || (module.payment_status === 'Paid' ? 'active' : 'pending'),
                        payment_status: module.payment_status || 'Pending',
                        payment_amount: module.payment_amount || 0,
                        registration_id: module.registration_id || null,
                        module_stats: {
                            total_weeks: 0,
                            total_projects: 0,
                            total_lessons: 0,
                            total_quizzes: 0,
                            total_assignments: 0,
                            total_resources: 0
                        }
                    };
                }
            })
        );

        // Filter out null values from modulesWithStats
        const validModules = modulesWithStats.filter(m => m !== null);
        
        console.log(`✅ Dashboard data prepared:`);
        console.log(`   - Stats:`, statsResult);
        console.log(`   - Current progress:`, currentProgress[0] ? 'Found' : 'None');
        console.log(`   - Recent activity: ${recentActivity.length} items`);
        console.log(`   - Enrolled modules: ${validModules.length} module(s)`);
        if (validModules.length > 0) {
            validModules.forEach(m => {
                console.log(`     * ${m.module_title}: ${m.module_stats?.total_weeks || 0} weeks, ${m.module_stats?.total_projects || 0} projects, ${m.module_stats?.total_lessons || 0} lessons`);
            });
        }

        return {
            stats: {
                ...statsResult,
                completion_percentage: completionPercentage
            },
            current_progress: currentProgress[0] || null,
            recent_activity: recentActivity,
            enrolled_modules: validModules
        };
    } catch (error) {
        console.error('Error in getMyDashboard:', error);
        console.error('Stack:', error.stack);
        // Return empty dashboard on error
        return {
            stats: {
                total_projects: 0,
                total_lessons: 0,
                total_weeks: 0,
                completed_lessons: 0,
                quizzes_taken: 0,
                completion_percentage: 0
            },
            current_progress: null,
            recent_activity: [],
            enrolled_modules: []
        };
    }
}

// User Profile
export async function getUserDetails(user_id) {
    const result = await sql`
        SELECT user_id, name, email, role
        FROM users
        WHERE user_id = ${user_id}
    `;
    return result[0];
}

export async function changePassword(user_id, currentPassword, newPassword) {
    const users = await sql`SELECT password_hash FROM users WHERE user_id = ${user_id}`;
    if (users.length === 0) throw new Error('User not found');
    const hashedPassword = users[0].password_hash;
    const match = await bcrypt.compare(currentPassword, hashedPassword);
    if (!match) throw new Error('Current password is incorrect');
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${hashedNewPassword} WHERE user_id = ${user_id}`;
}

export async function deleteAccount(user_id) {
    await sql`DELETE FROM users WHERE user_id = ${user_id}`;
}

export async function updateProfile(user_id, profileData) {
    const { name, email } = profileData;
    const existingUser = await sql`
        SELECT user_id FROM users
        WHERE email = ${email} AND user_id != ${user_id}
    `;
    if (existingUser.length > 0) {
        throw new Error('Email already exists');
    }
    await sql`
        UPDATE users
        SET name = ${name}, email = ${email}, updated_at = NOW()
        WHERE user_id = ${user_id}
    `;
}


// Get all live sessions
export async function getAllLiveSessions() {
    return await sql`SELECT * FROM live_sessions ORDER BY created_at DESC`;
}





// Create submission
// In assignment.model.js

export const getActiveAssignmentsForStudent = async (userId) => {
    try {
        const query = `
            SELECT 
                a.*,
                p.title AS project_title,
                l.title AS lesson_title
            FROM assignments a
            LEFT JOIN projects p ON a.project_id = p.project_id
            LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
            WHERE a.is_active = TRUE
            AND (a.due_date IS NULL OR a.due_date > NOW())
            ORDER BY a.due_date ASC, a.created_at DESC
        `;
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error('Error in getActiveAssignmentsForStudent:', error);
        throw error;
    }
};

// In assignmentSubmission.model.js

// Add these assignment-related functions to your student.model.js

export async function getStudentAssignments(userId, projectId = null) {
    try {
        // Get user's enrolled modules
        let modules;
        try {
            modules = await getUserEnrolledModules(userId);
        } catch (enrollError) {
            console.error(`Error getting enrolled modules for user ${userId}:`, enrollError);
            return [];
        }
        
        if (!modules || modules.length === 0 || !modules[0]) {
            console.log(`No enrolled modules found for user ${userId}`);
            return [];
        }
        
        const userModule = modules[0];
        if (!userModule || typeof userModule !== 'string') {
            console.error(`Invalid module value for user ${userId}:`, userModule);
            return [];
        }
        
        const normalizedModule = normalizeModule(userModule);
        console.log(`Fetching assignments for user ${userId} in module: ${userModule}`);
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        const isMEP = normalizedModule === 'MEP Design';
        
        // Build the main query with proper SQL construction
        let query;
        if (projectId) {
            query = isMEP
            ? sql`
                SELECT 
                    a.*,
                    COALESCE(
                        (SELECT p.title FROM projects p WHERE p.project_id = a.project_id),
                        (SELECT p.title FROM lessons l JOIN projects p ON l.project_id = p.project_id WHERE l.lesson_id = a.lesson_id)
                    ) as project_title,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM assignment_submissions s 
                            WHERE s.assignment_id = a.assignment_id AND s.user_id = ${userId}
                        ) THEN true 
                        ELSE false 
                    END as has_submitted
                FROM assignments a
                WHERE a.is_active = true
                    AND (
                        a.project_id = ${projectId} 
                        OR 
                        EXISTS (SELECT 1 FROM lessons l WHERE l.lesson_id = a.lesson_id AND l.project_id = ${projectId})
                    )
                ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
            `
            : sql`
                SELECT 
                    a.*,
                    COALESCE(
                        (SELECT p.title FROM projects p WHERE p.project_id = a.project_id),
                        (SELECT p.title FROM lessons l JOIN projects p ON l.project_id = p.project_id WHERE l.lesson_id = a.lesson_id)
                    ) as project_title,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM assignment_submissions s 
                            WHERE s.assignment_id = a.assignment_id AND s.user_id = ${userId}
                        ) THEN true 
                        ELSE false 
                    END as has_submitted
                FROM assignments a
                WHERE a.is_active = true
                    AND (
                        (a.project_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM projects p
                            JOIN weeks w ON p.week_id = w.week_id
                            WHERE p.project_id = a.project_id 
                              AND w.module IS NOT NULL 
                              AND w.module != ''
                              AND (
                                  LOWER(TRIM(w.module)) = ${userModuleLower}
                                  OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                                  OR w.module = ${userModule}
                                  OR w.module = ${normalizedModule}
                              )
                        ))
                        OR
                        (a.lesson_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM lessons l
                            JOIN projects p ON l.project_id = p.project_id
                            JOIN weeks w ON p.week_id = w.week_id
                            WHERE l.lesson_id = a.lesson_id 
                              AND w.module IS NOT NULL 
                              AND w.module != ''
                              AND (
                                  LOWER(TRIM(w.module)) = ${userModuleLower}
                                  OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                                  OR w.module = ${userModule}
                                  OR w.module = ${normalizedModule}
                              )
                        ))
                    )
                    AND (
                        a.project_id = ${projectId} 
                        OR 
                        EXISTS (SELECT 1 FROM lessons l WHERE l.lesson_id = a.lesson_id AND l.project_id = ${projectId})
                    )
                ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
            `;
        } else {
            query = isMEP
            ? sql`
                SELECT 
                    a.*,
                    COALESCE(
                        (SELECT p.title FROM projects p WHERE p.project_id = a.project_id),
                        (SELECT p.title FROM lessons l JOIN projects p ON l.project_id = p.project_id WHERE l.lesson_id = a.lesson_id)
                    ) as project_title,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM assignment_submissions s 
                            WHERE s.assignment_id = a.assignment_id AND s.user_id = ${userId}
                        ) THEN true 
                        ELSE false 
                    END as has_submitted
                FROM assignments a
                WHERE a.is_active = true
                ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
            `
            : sql`
                SELECT 
                    a.*,
                    COALESCE(
                        (SELECT p.title FROM projects p WHERE p.project_id = a.project_id),
                        (SELECT p.title FROM lessons l JOIN projects p ON l.project_id = p.project_id WHERE l.lesson_id = a.lesson_id)
                    ) as project_title,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM assignment_submissions s 
                            WHERE s.assignment_id = a.assignment_id AND s.user_id = ${userId}
                        ) THEN true 
                        ELSE false 
                    END as has_submitted
                FROM assignments a
                WHERE a.is_active = true
                    AND (
                        (a.project_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM projects p
                            JOIN weeks w ON p.week_id = w.week_id
                            WHERE p.project_id = a.project_id 
                              AND w.module IS NOT NULL 
                              AND w.module != ''
                              AND (
                                  LOWER(TRIM(w.module)) = ${userModuleLower}
                                  OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                                  OR w.module = ${userModule}
                                  OR w.module = ${normalizedModule}
                              )
                        ))
                        OR
                        (a.lesson_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM lessons l
                            JOIN projects p ON l.project_id = p.project_id
                            JOIN weeks w ON p.week_id = w.week_id
                            WHERE l.lesson_id = a.lesson_id 
                              AND w.module IS NOT NULL 
                              AND w.module != ''
                              AND (
                                  LOWER(TRIM(w.module)) = ${userModuleLower}
                                  OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                                  OR w.module = ${userModule}
                                  OR w.module = ${normalizedModule}
                              )
                        ))
                    )
                ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
            `;
        }
        
        const result = await query;
        console.log(`Found ${result.length} assignments for user ${userId} in module ${userModule}`);
        
        // Ensure dates are properly formatted
        return result.map(assignment => ({
            ...assignment,
            due_date: assignment.due_date ? new Date(assignment.due_date).toISOString() : null,
            created_at: assignment.created_at ? new Date(assignment.created_at).toISOString() : null,
            updated_at: assignment.updated_at ? new Date(assignment.updated_at).toISOString() : null
        }));
    } catch (error) {
        console.error('Error getting student assignments:', error);
        throw error;
    }
}

export async function getAssignmentById(assignmentId, userId) {
    try {
        // Verify user has access to this assignment
        const modules = await getUserEnrolledModules(userId);
        
        if (!modules || modules.length === 0 || !modules[0]) {
            throw new Error('No active course enrollment found');
        }
        
        const userModule = modules[0];
        const normalizedModule = normalizeModule(userModule);
        const isMEP = normalizedModule === 'MEP Design';
        
        // Check if assignment belongs to accessible module - handle both project and lesson links
        const result = isMEP
          ? await sql`
            SELECT 
                a.*,
                COALESCE(
                    (SELECT p.title FROM projects p WHERE p.project_id = a.project_id),
                    (SELECT p.title FROM lessons l JOIN projects p ON l.project_id = p.project_id WHERE l.lesson_id = a.lesson_id)
                ) as project_title
            FROM assignments a
            WHERE a.assignment_id = ${assignmentId}
          `
          : await sql`
            SELECT 
                a.*,
                COALESCE(
                    (SELECT p.title FROM projects p WHERE p.project_id = a.project_id),
                    (SELECT p.title FROM lessons l JOIN projects p ON l.project_id = p.project_id WHERE l.lesson_id = a.lesson_id)
                ) as project_title
            FROM assignments a
            WHERE a.assignment_id = ${assignmentId}
              AND (
                  -- Case 1: Assignment linked to project -> week -> module
                  (a.project_id IS NOT NULL AND EXISTS (
                      SELECT 1 FROM projects p
                      JOIN weeks w ON p.week_id = w.week_id
                      WHERE p.project_id = a.project_id AND w.module = ${userModule}
                  ))
                  OR
                  -- Case 2: Assignment linked to lesson -> project -> week -> module
                  (a.lesson_id IS NOT NULL AND EXISTS (
                      SELECT 1 FROM lessons l
                      JOIN projects p ON l.project_id = p.project_id
                      JOIN weeks w ON p.week_id = w.week_id
                      WHERE l.lesson_id = a.lesson_id AND w.module = ${userModule}
                  ))
              )
          `;
        
        if (result.length === 0) {
            throw new Error('You do not have access to this assignment');
        }
        
        const assignment = result[0];
        
        // Fetch files from assignment_files table
        const AssignmentFileModel = await import('./admin/assignment_file.model.js');
        const files = await AssignmentFileModel.getFilesByAssignment(assignmentId);
        
        return {
            ...assignment,
            files: files || []
        };
    } catch (error) {
        console.error('Error getting assignment by ID:', error);
        throw error;
    }
}

export async function recordAssignmentDownload(assignmentId, userId) {
    try {
        await sql`
            INSERT INTO assignment_downloads (assignment_id, user_id, downloaded_at)
            VALUES (${assignmentId}, ${userId}, CURRENT_TIMESTAMP)
        `;
        return { success: true };
    } catch (error) {
        console.error('Error recording assignment download:', error);
        throw error;
    }
}

// Helper function to ensure schema exists
async function ensureSubmissionSchema() {
    try {
        // Check if answer_file_url column exists
        const columnCheck = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assignment_submissions' 
            AND column_name = 'answer_file_url'
        `;
        
        if (columnCheck.length === 0) {
            console.log('⚠️ Missing columns detected. Adding missing columns to assignment_submissions...');
            
            // Add answer_file_url
            await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS answer_file_url text`;
            await sql`UPDATE assignment_submissions SET answer_file_url = '' WHERE answer_file_url IS NULL`;
            await sql`ALTER TABLE assignment_submissions ALTER COLUMN answer_file_url SET NOT NULL`;
            
            // Add other missing columns
            await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS answer_file_name character varying`;
            await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_size_bytes bigint`;
            await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'submitted'`;
            await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP`;
            
            console.log('✅ Schema updated successfully');
        }
    } catch (schemaError) {
        console.error('⚠️ Error checking/updating schema (non-critical):', schemaError.message);
        // Don't throw - let the insert try anyway
    }
}

export async function createSubmission(submissionData) {
    try {
        // Ensure schema exists before inserting
        await ensureSubmissionSchema();
        
        const { assignment_id, user_id, answer_file_url, answer_file_name, file_size_bytes, status } = submissionData;
        
        const result = await sql`
            INSERT INTO assignment_submissions (
                assignment_id, 
                user_id, 
                answer_file_url, 
                answer_file_name, 
                file_size_bytes, 
                status, 
                submitted_at
            ) VALUES (
                ${assignment_id}, 
                ${user_id}, 
                ${answer_file_url}, 
                ${answer_file_name}, 
                ${file_size_bytes}, 
                ${status || 'submitted'}, 
                CURRENT_TIMESTAMP
            ) RETURNING *
        `;
        
        return result[0];
    } catch (error) {
        console.error('Error creating submission:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        throw error;
    }
}

export async function getSubmissionByAssignmentAndUser(assignmentId, userId) {
    try {
        const result = await sql`
            SELECT * FROM assignment_submissions 
            WHERE assignment_id = ${assignmentId} AND user_id = ${userId}
            LIMIT 1
        `;
        return result[0] || null;
    } catch (error) {
        console.error('Error getting submission:', error);
        throw error;
    }
}

export async function getSubmissionById(submissionId) {
    try {
        const result = await sql`
            SELECT 
                s.*,
                a.title as assignment_title,
                p.title as project_title
            FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.assignment_id
            LEFT JOIN projects p ON a.project_id = p.project_id
            WHERE s.submission_id = ${submissionId}
        `;
        return result[0] || null;
    } catch (error) {
        console.error('Error getting submission by ID:', error);
        throw error;
    }
}

export async function getSubmissionFiles(submissionId) {
    try {
        const files = await sql`
            SELECT 
                f.file_id,
                f.submission_id,
                f.file_name,
                f.file_url,
                f.file_size_bytes,
                f.uploaded_at,
                f.uploaded_by,
                u.name AS uploaded_by_name,
                u.role AS uploaded_by_role
            FROM assignment_submission_files f
            LEFT JOIN users u ON u.user_id = f.uploaded_by
            WHERE f.submission_id = ${submissionId}
            ORDER BY f.uploaded_at ASC
        `;
        
        return files.map(file => ({
            id: file.file_id,
            name: file.file_name,
            url: file.file_url,
            size: file.file_size_bytes,
            uploadedAt: file.uploaded_at,
            uploadedBy: file.uploaded_by,
            uploadedByName: file.uploaded_by_name || null,
            uploadedByRole: file.uploaded_by_role || null
        }));
    } catch (error) {
        console.error('Error getting submission files:', error);
        throw error; // Re-throw to be handled by the controller
    }
}

// Utility: get submission_id owning a given submission file id
export async function getSubmissionIdByFileId(fileId) {
    try {
        const result = await sql`
            SELECT submission_id 
            FROM assignment_submission_files 
            WHERE file_id = ${fileId}
        `;
        if (result.length === 0) return null;
        return result[0].submission_id;
    } catch (error) {
        console.error('Error in getSubmissionIdByFileId:', error);
        throw error;
    }
}

export async function getSubmissionsByUser(userId) {
    try {
        let modules;
        try {
            modules = await getUserEnrolledModules(userId);
        } catch (enrollError) {
            console.error(`Error getting enrolled modules for user ${userId}:`, enrollError);
            return [];
        }

        if (!modules || modules.length === 0 || !modules[0]) {
            console.log(`No enrolled modules found for user ${userId} in submissions query`);
            return [];
        }

        const userModule = modules[0];
        if (!userModule || typeof userModule !== 'string') {
            console.error(`Invalid module value for user ${userId}:`, userModule);
            return [];
        }

        const normalizedModule = normalizeModule(userModule);
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        const isMEP = normalizedModule === 'MEP Design';

        let result;
        try {
            result = isMEP
                ? await sql`
                    SELECT 
                        s.submission_id,
                        s.assignment_id,
                        s.answer_file_name,
                        s.answer_file_url,
                        s.file_size_bytes,
                        s.submitted_at,
                        s.grade,
                        s.feedback,
                        s.status,
                        a.title as assignment_title,
                        a.description as assignment_description,
                        COALESCE(p.title, lp.title) as project_title,
                        ${userModule}::text as module
                    FROM assignment_submissions s
                    JOIN assignments a ON s.assignment_id = a.assignment_id
                    LEFT JOIN projects p ON a.project_id = p.project_id
                    LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
                    LEFT JOIN projects lp ON l.project_id = lp.project_id
                    LEFT JOIN weeks w ON COALESCE(p.week_id, lp.week_id) = w.week_id
                    WHERE s.user_id = ${userId}
                    ORDER BY s.submitted_at DESC
                `
                : await sql`
                    SELECT 
                        s.submission_id,
                        s.assignment_id,
                        s.answer_file_name,
                        s.answer_file_url,
                        s.file_size_bytes,
                        s.submitted_at,
                        s.grade,
                        s.feedback,
                        s.status,
                        a.title as assignment_title,
                        a.description as assignment_description,
                        COALESCE(p.title, lp.title) as project_title,
                        ${userModule}::text as module
                    FROM assignment_submissions s
                    JOIN assignments a ON s.assignment_id = a.assignment_id
                    LEFT JOIN projects p ON a.project_id = p.project_id
                    LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
                    LEFT JOIN projects lp ON l.project_id = lp.project_id
                    LEFT JOIN weeks w ON COALESCE(p.week_id, lp.week_id) = w.week_id
                    WHERE s.user_id = ${userId}
                      AND (
                        (
                            a.module IS NOT NULL AND a.module != '' AND (
                                LOWER(TRIM(a.module)) = ${userModuleLower}
                                OR LOWER(TRIM(a.module)) = ${normalizedModuleLower}
                                OR a.module = ${userModule}
                                OR a.module = ${normalizedModule}
                            )
                        )
                        OR (
                            p.module IS NOT NULL AND p.module != '' AND (
                                LOWER(TRIM(p.module)) = ${userModuleLower}
                                OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                                OR p.module = ${userModule}
                                OR p.module = ${normalizedModule}
                            )
                        )
                        OR (
                            l.module IS NOT NULL AND l.module != '' AND (
                                LOWER(TRIM(l.module)) = ${userModuleLower}
                                OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                                OR l.module = ${userModule}
                                OR l.module = ${normalizedModule}
                            )
                        )
                        OR (
                            w.module IS NOT NULL AND w.module != '' AND (
                                LOWER(TRIM(w.module)) = ${userModuleLower}
                                OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                                OR w.module = ${userModule}
                                OR w.module = ${normalizedModule}
                            )
                        )
                      )
                    ORDER BY s.submitted_at DESC
                `;
        } catch (sqlError) {
            console.error('SQL error in getSubmissionsByUser:', sqlError);
            // Fallback: return submissions without module filtering
            result = await sql`
                SELECT 
                    s.submission_id,
                    s.assignment_id,
                    s.answer_file_name,
                    s.answer_file_url,
                    s.file_size_bytes,
                    s.submitted_at,
                    s.grade,
                    s.feedback,
                    s.status,
                    a.title as assignment_title,
                    a.description as assignment_description,
                    COALESCE(p.title, lp.title) as project_title
                FROM assignment_submissions s
                JOIN assignments a ON s.assignment_id = a.assignment_id
                LEFT JOIN projects p ON a.project_id = p.project_id
                LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
                LEFT JOIN projects lp ON l.project_id = lp.project_id
                WHERE s.user_id = ${userId}
                ORDER BY s.submitted_at DESC
            `;
        }

        console.log(`Found ${result.length} submissions for user ${userId} in module ${userModule}`);
        return result;
    } catch (error) {
        console.error('Error getting submissions by user:', error);
        console.error('Error stack:', error.stack);
        // Return empty array instead of throwing to prevent 500 errors
        return [];
    }
}

// ============================================
// Get ALL Module Content for User
// Returns all weeks, projects, lessons, quizzes, assignments, and resources
// for the user's enrolled module
// ============================================
export async function getAllModuleContent(user_id) {
    try {
        console.log(`\n🔍 [getAllModuleContent] Starting for user_id: ${user_id}`);
        
        // Get user's enrolled modules
        let modules;
        try {
            modules = await getUserEnrolledModules(user_id);
            console.log(`📋 [getAllModuleContent] getUserEnrolledModules returned:`, modules);
        } catch (enrollError) {
            console.error(`❌ [getAllModuleContent] Error getting enrolled modules:`, enrollError);
            console.error(`Error stack:`, enrollError.stack);
            return {
                success: false,
                message: 'Error fetching user enrollment information',
                error: enrollError.message,
                data: {
                    weeks: [],
                    projects: [],
                    lessons: [],
                    quizzes: [],
                    assignments: [],
                    resources: [],
                    module: null
                }
            };
        }
        
        if (!modules || modules.length === 0 || !modules[0]) {
            console.warn(`⚠️ [getAllModuleContent] No enrolled modules found for user ${user_id}`);
            
            // Debug: Check what enrollments exist
            const allEnrollments = await sql`
                SELECT * FROM enrollments WHERE user_id = ${user_id} ORDER BY enrolled_at DESC
            `;
            console.log(`🔍 [getAllModuleContent] All enrollments for user:`, allEnrollments);
            
            const allRegistrations = await sql`
                SELECT id, module, payment_status, email_address 
                FROM register 
                WHERE user_id = ${user_id} OR email_address IN (
                    SELECT email FROM users WHERE user_id = ${user_id}
                )
                ORDER BY created_at DESC
            `;
            console.log(`🔍 [getAllModuleContent] All registrations for user:`, allRegistrations);
            
            return {
                success: false,
                message: 'No active enrollment found. Please ensure you are enrolled in a course module.',
                data: {
                    weeks: [],
                    projects: [],
                    lessons: [],
                    quizzes: [],
                    assignments: [],
                    resources: [],
                    module: null
                }
            };
        }
        
        const userModule = modules[0];
        if (!userModule || typeof userModule !== 'string') {
            console.error(`❌ [getAllModuleContent] Invalid module value:`, userModule);
            return {
                success: false,
                message: 'Invalid module information found',
                error: 'Module value is not a valid string',
                data: {
                    weeks: [],
                    projects: [],
                    lessons: [],
                    quizzes: [],
                    assignments: [],
                    resources: [],
                    module: null
                }
            };
        }
        
        const normalizedModule = normalizeModule(userModule);
        const isMEP = normalizedModule === 'MEP Design';
        
        // Simple module matching (case-insensitive)
        const userModuleLower = (userModule || '').toLowerCase().trim();
        const normalizedModuleLower = (normalizedModule || '').toLowerCase().trim();
        
        console.log(`📚 [getAllModuleContent] Fetching content for user ${user_id}`);
        console.log(`   - User Module: "${userModule}"`);
        console.log(`   - Normalized Module: "${normalizedModule}"`);
        console.log(`   - User Module Lower: "${userModuleLower}"`);
        console.log(`   - Normalized Module Lower: "${normalizedModuleLower}"`);
        
        // Fetch all content types in parallel with MEP super-access
        const [weeks, projects, lessons, quizzes, assignments, resources] = await Promise.all([
            // Weeks
            isMEP ? sql`
                SELECT 
                    w.week_id,
                    w.title,
                    w.description,
                    w.order_num,
                    w.module,
                    COUNT(DISTINCT p.project_id) as project_count
                FROM weeks w
                LEFT JOIN projects p ON p.week_id = w.week_id
                GROUP BY w.week_id, w.title, w.description, w.order_num, w.module
                ORDER BY w.order_num NULLS LAST, w.week_id
            ` : sql`
                SELECT 
                    w.week_id,
                    w.title,
                    w.description,
                    w.order_num,
                    w.module,
                    COUNT(DISTINCT p.project_id) as project_count
                FROM weeks w
                LEFT JOIN projects p ON p.week_id = w.week_id
                WHERE w.module IS NOT NULL 
                  AND w.module != ''
                  AND (
                      LOWER(TRIM(w.module)) = ${userModuleLower}
                      OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                      OR w.module = ${userModule}
                      OR w.module = ${normalizedModule}
                  )
                GROUP BY w.week_id, w.title, w.description, w.order_num, w.module
                ORDER BY w.order_num NULLS LAST, w.week_id
            `,

            // Projects
            isMEP ? sql`
                SELECT 
                    p.project_id,
                    p.title,
                    p.short_description,
                    p.image_url,
                    p.video_url,
                    p.order_num,
                    p.module,
                    w.week_id,
                    w.title as week_title,
                    COUNT(DISTINCT l.lesson_id) as lesson_count
                FROM projects p
                LEFT JOIN weeks w ON p.week_id = w.week_id
                LEFT JOIN lessons l ON l.project_id = p.project_id
                GROUP BY p.project_id, p.title, p.short_description, p.image_url, p.video_url, p.order_num, p.module, w.week_id, w.title
                ORDER BY w.order_num NULLS LAST, p.order_num NULLS LAST
            ` : sql`
                SELECT 
                    p.project_id,
                    p.title,
                    p.short_description,
                    p.image_url,
                    p.video_url,
                    p.order_num,
                    p.module,
                    w.week_id,
                    w.title as week_title,
                    COUNT(DISTINCT l.lesson_id) as lesson_count
                FROM projects p
                LEFT JOIN weeks w ON p.week_id = w.week_id
                LEFT JOIN lessons l ON l.project_id = p.project_id
                WHERE (
                    (p.module IS NOT NULL 
                      AND p.module != ''
                      AND (
                          LOWER(TRIM(p.module)) = ${userModuleLower}
                          OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                          OR p.module = ${userModule}
                          OR p.module = ${normalizedModule}
                      ))
                    OR (w.module IS NOT NULL 
                      AND w.module != ''
                      AND (
                          LOWER(TRIM(w.module)) = ${userModuleLower}
                          OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                          OR w.module = ${userModule}
                          OR w.module = ${normalizedModule}
                      ))
                )
                GROUP BY p.project_id, p.title, p.short_description, p.image_url, p.video_url, p.order_num, p.module, w.week_id, w.title
                ORDER BY w.order_num NULLS LAST, p.order_num NULLS LAST
            `,

            // Lessons
            isMEP ? sql`
                SELECT 
                    l.lesson_id,
                    l.title,
                    l.content,
                    l.order_num,
                    p.project_id,
                    p.title as project_title,
                    w.week_id,
                    w.title as week_title
                FROM lessons l
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                ORDER BY w.order_num NULLS LAST, p.order_num NULLS LAST, l.order_num NULLS LAST
            ` : sql`
                SELECT 
                    l.lesson_id,
                    l.title,
                    l.content,
                  
                
                    l.order_num,
            
                    p.project_id,
                    p.title as project_title,
                    w.week_id,
                    w.title as week_title
                FROM lessons l
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                WHERE (
                    (l.module IS NOT NULL 
                      AND l.module != ''
                      AND (
                          LOWER(TRIM(l.module)) = ${userModuleLower}
                          OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                          OR l.module = ${userModule}
                          OR l.module = ${normalizedModule}
                      ))
                    OR (p.module IS NOT NULL 
                      AND p.module != ''
                      AND (
                          LOWER(TRIM(p.module)) = ${userModuleLower}
                          OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                          OR p.module = ${userModule}
                          OR p.module = ${normalizedModule}
                      ))
                    OR (w.module IS NOT NULL 
                      AND w.module != ''
                      AND (
                          LOWER(TRIM(w.module)) = ${userModuleLower}
                          OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                          OR w.module = ${userModule}
                          OR w.module = ${normalizedModule}
                      ))
                )
                ORDER BY w.order_num NULLS LAST, p.order_num NULLS LAST, l.order_num NULLS LAST
            `,

            // Quizzes
            isMEP ? sql`
                SELECT 
                    q.quiz_id,
                    q.title,
                    q.description,
                    q.start_time,
                    q.end_time,
                    q.time_limit,
                    q.project_id,
                    q.lesson_id,
                    q.module,
                    p.title as project_title,
                    l.title as lesson_title,
                    w.week_id,
                    w.title as week_title
                FROM quizzes q
                LEFT JOIN projects p ON q.project_id = p.project_id
                LEFT JOIN lessons l ON q.lesson_id = l.lesson_id
                LEFT JOIN projects p2 ON l.project_id = p2.project_id
                LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                ORDER BY q.start_time NULLS LAST, q.quiz_id
            ` : sql`
                SELECT 
                    q.quiz_id,
                    q.title,
                    q.description,
                    q.start_time,
                    q.end_time,
                    q.time_limit,
                    q.project_id,
                    q.lesson_id,
                    q.module,
                    p.title as project_title,
                    l.title as lesson_title,
                    w.week_id,
                    w.title as week_title
                FROM quizzes q
                LEFT JOIN projects p ON q.project_id = p.project_id
                LEFT JOIN lessons l ON q.lesson_id = l.lesson_id
                LEFT JOIN projects p2 ON l.project_id = p2.project_id
                LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                WHERE (
                    (q.module IS NOT NULL 
                      AND q.module != ''
                      AND (
                          LOWER(TRIM(q.module)) = ${userModuleLower}
                          OR LOWER(TRIM(q.module)) = ${normalizedModuleLower}
                          OR q.module = ${userModule}
                          OR q.module = ${normalizedModule}
                      ))
                    OR (p.module IS NOT NULL 
                      AND p.module != ''
                      AND (
                          LOWER(TRIM(p.module)) = ${userModuleLower}
                          OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                          OR p.module = ${userModule}
                          OR p.module = ${normalizedModule}
                      ))
                    OR (l.module IS NOT NULL 
                      AND l.module != ''
                      AND (
                          LOWER(TRIM(l.module)) = ${userModuleLower}
                          OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                          OR l.module = ${userModule}
                          OR l.module = ${normalizedModule}
                      ))
                    OR (w.module IS NOT NULL 
                      AND w.module != ''
                      AND (
                          LOWER(TRIM(w.module)) = ${userModuleLower}
                          OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                          OR w.module = ${userModule}
                          OR w.module = ${normalizedModule}
                      ))
                )
                ORDER BY q.start_time NULLS LAST, q.quiz_id
            `,

            // Assignments (no question_file_url column in DB)
            isMEP ? sql`
                SELECT 
                    a.assignment_id,
                    a.title,
                    a.description,
                    a.due_date,
                    a.project_id,
                    a.lesson_id,
                    a.module,
                    a.created_at,
                    a.max_file_size_mb,
                    a.allowed_file_types,
                    p.title as project_title,
                    l.title as lesson_title,
                    w.week_id,
                    w.title as week_title,
                    CASE 
                        WHEN a.project_id IS NOT NULL THEN 'project'
                        WHEN a.lesson_id IS NOT NULL THEN 'lesson'
                    END as assignment_type
                FROM assignments a
                LEFT JOIN projects p ON a.project_id = p.project_id
                LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
                LEFT JOIN projects p2 ON l.project_id = p2.project_id
                LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                WHERE a.is_active = true
                ORDER BY a.due_date NULLS LAST, a.created_at DESC
            ` : sql`
                SELECT 
                    a.assignment_id,
                    a.title,
                    a.description,
                    a.due_date,
                    a.project_id,
                    a.lesson_id,
                    a.module,
                    a.created_at,
                    a.max_file_size_mb,
                    a.allowed_file_types,
                    p.title as project_title,
                    l.title as lesson_title,
                    w.week_id,
                    w.title as week_title,
                    CASE 
                        WHEN a.project_id IS NOT NULL THEN 'project'
                        WHEN a.lesson_id IS NOT NULL THEN 'lesson'
                    END as assignment_type
                FROM assignments a
                LEFT JOIN projects p ON a.project_id = p.project_id
                LEFT JOIN lessons l ON a.lesson_id = l.lesson_id
                LEFT JOIN projects p2 ON l.project_id = p2.project_id
                LEFT JOIN weeks w ON COALESCE(p.week_id, p2.week_id) = w.week_id
                WHERE a.is_active = true
                  AND (
                      (a.module IS NOT NULL 
                        AND a.module != ''
                        AND (
                            LOWER(TRIM(a.module)) = ${userModuleLower}
                            OR LOWER(TRIM(a.module)) = ${normalizedModuleLower}
                            OR a.module = ${userModule}
                            OR a.module = ${normalizedModule}
                        ))
                      OR (p.module IS NOT NULL 
                        AND p.module != ''
                        AND (
                            LOWER(TRIM(p.module)) = ${userModuleLower}
                            OR LOWER(TRIM(p.module)) = ${normalizedModuleLower}
                            OR p.module = ${userModule}
                            OR p.module = ${normalizedModule}
                        ))
                      OR (l.module IS NOT NULL 
                        AND l.module != ''
                        AND (
                            LOWER(TRIM(l.module)) = ${userModuleLower}
                            OR LOWER(TRIM(l.module)) = ${normalizedModuleLower}
                            OR l.module = ${userModule}
                            OR l.module = ${normalizedModule}
                        ))
                      OR (w.module IS NOT NULL 
                        AND w.module != ''
                        AND (
                            LOWER(TRIM(w.module)) = ${userModuleLower}
                            OR LOWER(TRIM(w.module)) = ${normalizedModuleLower}
                            OR w.module = ${userModule}
                            OR w.module = ${normalizedModule}
                        ))
                  )
                ORDER BY a.due_date NULLS LAST, a.created_at DESC
            `,

            // Resources
            getResources(null, user_id)
        ]);
        
        console.log(`\n✅ [getAllModuleContent] Retrieved module content for "${userModule}":`);
        console.log(`   - Weeks: ${weeks.length}`);
        console.log(`   - Projects: ${projects.length}`);
        console.log(`   - Lessons: ${lessons.length}`);
        console.log(`   - Quizzes: ${quizzes.length}`);
        console.log(`   - Assignments: ${assignments.length}`);
        console.log(`   - Resources: ${resources.length}`);
        
        // Debug: If no content found, check what modules exist in database
        if (weeks.length === 0 && projects.length === 0) {
            console.warn(`\n⚠️ [getAllModuleContent] No content found! Checking database...`);
            
            // Check all weeks in database
            const allWeeksModules = await sql`
                SELECT DISTINCT module FROM weeks WHERE module IS NOT NULL AND module != '' ORDER BY module
            `;
            console.log(`🔍 [getAllModuleContent] All modules in weeks table:`, allWeeksModules.map(w => w.module));
            
            // Check what module values exist
            const weekSample = await sql`
                SELECT week_id, title, module FROM weeks WHERE module IS NOT NULL LIMIT 5
            `;
            console.log(`🔍 [getAllModuleContent] Sample weeks:`, weekSample);
            
            // Check projects
            const allProjectsModules = await sql`
                SELECT DISTINCT p.module, w.module as week_module
                FROM projects p 
                LEFT JOIN weeks w ON p.week_id = w.week_id
                WHERE (p.module IS NOT NULL AND p.module != '') OR (w.module IS NOT NULL AND w.module != '')
                LIMIT 10
            `;
            console.log(`🔍 [getAllModuleContent] Sample project modules:`, allProjectsModules);
        }
        
        return {
            success: true,
            message: 'Module content retrieved successfully',
            data: {
                weeks: weeks,
                projects: projects,
                lessons: lessons,
                quizzes: quizzes,
                assignments: assignments,
                resources: resources,
                module: userModule,
                module_title: normalizedModule
            }
        };
    } catch (error) {
        console.error('Error in getAllModuleContent:', error);
        console.error('Stack:', error.stack);
        return {
            success: false,
            message: 'Error fetching module content',
            error: error.message,
            data: {
                weeks: [],
                projects: [],
                lessons: [],
                quizzes: [],
                assignments: [],
                resources: [],
                module: null
            }
        };
    }
}

// ============================================
// Content Integrity Diagnostics for User Module
// Checks existence and linkage of weeks/projects/lessons/resources
// ============================================
export async function getModuleContentIntegrity(user_id) {
    try {
        // Determine user's active module using same logic as dashboard
        const modules = await getUserEnrolledModules(user_id);
        const userModule = modules?.[0] || null;

        // Fallback: attempt to read most recent registration module
        let enrolledModulesDetails = [];
        if (!userModule) {
            const userEmailResult = await sql`SELECT email FROM users WHERE user_id = ${user_id} LIMIT 1`;
            const userEmail = userEmailResult?.[0]?.email || null;
            enrolledModulesDetails = await sql`
                SELECT 
                    COALESCE(e.module, r.module) AS module,
                    COALESCE(e.module, r.module) AS module_title
                FROM enrollments e
                LEFT JOIN register r ON r.user_id = e.user_id
                WHERE e.user_id = ${user_id} OR r.user_id = ${user_id} OR r.email_address = ${userEmail}
                ORDER BY COALESCE(e.enrolled_at, r.created_at) DESC
                LIMIT 1
            `;
        }
        const moduleValue = userModule || enrolledModulesDetails?.[0]?.module || null;
        const normalizedModule = moduleValue ? normalizeModule(moduleValue) : null;
        const userModuleLower = moduleValue ? moduleValue.toLowerCase().trim() : null;
        const normalizedModuleLower = normalizedModule ? normalizedModule.toLowerCase().trim() : null;

        // If still no module detected, run generic diagnostics
        const hasModule = !!moduleValue;

        // Core matching predicate reused across queries
        const moduleMatchPredicate = (column) => sql`(
            ${column} IS NOT NULL AND ${column} != '' AND (
                LOWER(TRIM(${column})) = ${userModuleLower}
                OR LOWER(TRIM(${column})) = ${normalizedModuleLower}
                OR ${column} = ${moduleValue}
                OR ${column} = ${normalizedModule}
            )
        )`;

        // Diagnostics queries
        const [
            weeksWithoutModule,
            projectsWithoutWeek,
            lessonsWithoutProject,
            lessonsMismatched,
            resourcesNonPublicMismatch,
            weeksForModuleCount,
            projectsForModuleCount,
            lessonsForModuleCount,
            resourcesPublicCount,
            resourcesModuleSpecificCount
        ] = await Promise.all([
            // Weeks missing module
            sql`SELECT week_id, title, module FROM weeks WHERE module IS NULL OR module = '' ORDER BY week_id LIMIT 50`,

            // Projects missing week linkage
            sql`SELECT project_id, title, week_id FROM projects WHERE week_id IS NULL ORDER BY project_id LIMIT 50`,

            // Lessons missing project linkage
            sql`SELECT lesson_id, title, project_id, module FROM lessons WHERE project_id IS NULL ORDER BY lesson_id LIMIT 50`,

            // Lessons that do NOT match user's module via lesson.module OR project.module OR week.module
            // Only computed when module is known; else return empty
            hasModule ? sql`
                SELECT 
                    l.lesson_id,
                    l.title,
                    l.module AS lesson_module,
                    p.project_id,
                    p.module AS project_module,
                    w.week_id,
                    w.module AS week_module
                FROM lessons l
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                WHERE NOT (
                    (${moduleMatchPredicate(sql`l.module`)})
                    OR (${moduleMatchPredicate(sql`p.module`)})
                    OR (${moduleMatchPredicate(sql`w.module`)})
                )
                ORDER BY l.lesson_id
                LIMIT 100
            ` : sql`SELECT NULL WHERE FALSE`,

            // Non-public resources whose module does NOT match user's module
            hasModule ? sql`
                SELECT resource_id, title, module, is_public
                FROM resources
                WHERE (is_public = false OR is_public IS NULL)
                  AND NOT (${moduleMatchPredicate(sql`module`)})
                ORDER BY resource_id
                LIMIT 100
            ` : sql`SELECT NULL WHERE FALSE`,

            // Counts using same matching rules as getAllModuleContent
            hasModule ? sql`
                SELECT COUNT(*)::int AS count
                FROM weeks w
                WHERE ${moduleMatchPredicate(sql`w.module`)}
            ` : sql`SELECT 0::int AS count`,

            hasModule ? sql`
                SELECT COUNT(DISTINCT p.project_id)::int AS count
                FROM projects p
                LEFT JOIN weeks w ON p.week_id = w.week_id
                WHERE (${moduleMatchPredicate(sql`p.module`)}) OR (${moduleMatchPredicate(sql`w.module`)})
            ` : sql`SELECT 0::int AS count`,

            hasModule ? sql`
                SELECT COUNT(DISTINCT l.lesson_id)::int AS count
                FROM lessons l
                LEFT JOIN projects p ON l.project_id = p.project_id
                LEFT JOIN weeks w ON p.week_id = w.week_id
                WHERE (${moduleMatchPredicate(sql`l.module`)})
                   OR (${moduleMatchPredicate(sql`p.module`)})
                   OR (${moduleMatchPredicate(sql`w.module`)})
            ` : sql`SELECT 0::int AS count`,

            sql`SELECT COUNT(*)::int AS count FROM resources WHERE is_public = true`,

            hasModule ? sql`
                SELECT COUNT(*)::int AS count FROM resources WHERE is_public = false AND ${moduleMatchPredicate(sql`module`)}
            ` : sql`SELECT 0::int AS count`
        ]);

        return {
            success: true,
            message: 'Module content integrity diagnostics',
            data: {
                module: moduleValue || null,
                module_title: normalizedModule || null,
                checks: {
                    weeks_without_module: weeksWithoutModule,
                    projects_without_week: projectsWithoutWeek,
                    lessons_without_project: lessonsWithoutProject,
                    lessons_mismatched_module: lessonsMismatched?.filter(r => r?.lesson_id) || [],
                    resources_non_public_mismatched_module: resourcesNonPublicMismatch?.filter(r => r?.resource_id) || []
                },
                counts: {
                    weeks_for_module: weeksForModuleCount?.[0]?.count || 0,
                    projects_for_module: projectsForModuleCount?.[0]?.count || 0,
                    lessons_for_module: lessonsForModuleCount?.[0]?.count || 0,
                    resources_public: resourcesPublicCount?.[0]?.count || 0,
                    resources_module_specific: resourcesModuleSpecificCount?.[0]?.count || 0
                }
            }
        };
    } catch (error) {
        console.error('Error in getModuleContentIntegrity:', error);
        return {
            success: false,
            message: 'Error running integrity diagnostics',
            error: error.message,
            data: {
                module: null,
                module_title: null,
                checks: {
                    weeks_without_module: [],
                    projects_without_week: [],
                    lessons_without_project: [],
                    lessons_mismatched_module: [],
                    resources_non_public_mismatched_module: []
                },
                counts: {
                    weeks_for_module: 0,
                    projects_for_module: 0,
                    lessons_for_module: 0,
                    resources_public: 0,
                    resources_module_specific: 0
                }
            }
        };
    }
}