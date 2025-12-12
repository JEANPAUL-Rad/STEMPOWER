// Script to fix assignment_submissions table schema
import sql from '../src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixSchema() {
  try {
    console.log('🔧 Checking assignment_submissions table schema...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/017_fix_assignment_submissions_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📝 Running migration...');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Schema fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  }
}

fixSchema();






