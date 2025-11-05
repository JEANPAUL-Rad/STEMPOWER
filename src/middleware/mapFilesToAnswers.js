export function mapFilesToAnswers(req, res, next) {
    // Parse JSON string to object if needed
    if (req.body.answers) {
        try {
            req.body.answers = JSON.parse(req.body.answers);
        } catch (err) {
            console.error('❌ Error parsing answers JSON:', err);
            return res.status(400).json({ message: 'Invalid answers JSON' });
        }
    } else {
        req.body.answers = [];
    }

    if (req.files && req.files.length) {
        req.files.forEach(file => {
            const match = file.fieldname.match(/^file_(\d+)$/);
            if (match) {
                const questionId = parseInt(match[1], 10);
                const answer = req.body.answers.find(a => parseInt(a.question_id) === questionId);

                if (answer) {
                    answer.file = file;
                    answer.has_file = true; // ✅ Set this for clarity in logs and backend
                    console.log(`📎 [mapFilesToAnswers] Attached file '${file.originalname}' to question ID ${questionId}`);
                } else {
                    console.warn(`⚠️ [mapFilesToAnswers] No matching answer for uploaded file on question ID ${questionId}`);
                }
            } else {
                console.warn(`⚠️ [mapFilesToAnswers] Skipping unknown field: ${file.fieldname}`);
            }
        });
    } else {
        console.log('ℹ️ No files uploaded');
    }

    next();
}
