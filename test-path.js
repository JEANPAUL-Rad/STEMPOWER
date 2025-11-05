const path = require('path');
const fileUrl = '/uploads/quiz-files/file-1754855696319-822620899.pdf';
console.log(path.join(process.cwd(), fileUrl.replace(/^[\/\\]+/, '')));
// Should print: /your/project/root/uploads/quiz-files/file-1754855696319-822620899.pdf