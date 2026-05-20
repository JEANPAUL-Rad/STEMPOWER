import postgres from 'postgres';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const migrationPath = path.resolve('migrations', '020_add_is_active_columns.sql');
    console.log(`📂 Reading migration from ${migrationPath}...`);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...');
    await sql.unsafe(migrationSql);
    
    console.log('✅ Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

runMigration();
