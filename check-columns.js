import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function checkColumns() {
  const tables = ['weeks', 'projects', 'lessons', 'assignments', 'resources', 'quizzes'];
  console.log('🔍 Checking for week_id column in tables...');
  
  for (const table of tables) {
    try {
      const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = 'week_id'
      `;
      if (result.length > 0) {
        console.log(`✅ Table "${table}" HAS week_id`);
      } else {
        console.log(`❌ Table "${table}" DOES NOT HAVE week_id`);
      }
    } catch (err) {
      console.error(`Error checking table ${table}:`, err.message);
    }
  }
  process.exit(0);
}

checkColumns();
