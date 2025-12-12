// Script to verify all file storage tables exist and have correct structure
import sql from '../src/config/db.js';

const requiredTables = [
  {
    name: 'assignment_files',
    requiredColumns: ['file_id', 'assignment_id', 'file_url', 'file_name', 'file_size_bytes', 'uploaded_by', 'uploaded_at']
  },
  {
    name: 'assignment_submission_files',
    requiredColumns: ['file_id', 'submission_id', 'file_url', 'file_name', 'file_size_bytes', 'uploaded_by', 'uploaded_at']
  },
  {
    name: 'lesson_files',
    requiredColumns: ['file_id', 'lesson_id', 'file_url', 'file_name', 'file_type', 'file_size_bytes', 'uploaded_by', 'uploaded_at']
  },
  {
    name: 'quiz_question_files',
    requiredColumns: ['file_id', 'question_id', 'file_url', 'file_name', 'file_type', 'uploaded_by', 'uploaded_at']
  },
  {
    name: 'resource_files',
    requiredColumns: ['file_id', 'resource_id', 'file_url', 'file_name', 'file_type', 'file_size_bytes', 'uploaded_by', 'uploaded_at']
  },
  {
    name: 'submission_answer_files',
    requiredColumns: ['file_id', 'answer_id', 'file_url', 'file_name', 'file_type', 'file_size_bytes', 'uploaded_by', 'uploaded_at']
  },
  {
    name: 'protoforial_files',
    requiredColumns: ['file_id', 'proto_id', 'file_url', 'file_name', 'file_type', 'file_size_bytes', 'uploaded_at']
  }
];

async function verifyTables() {
  console.log('🔍 Verifying file storage tables...\n');
  
  const results = [];
  
  for (const table of requiredTables) {
    try {
      // Check if table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table.name}
        )
      `;
      
      if (!tableExists[0].exists) {
        results.push({
          table: table.name,
          status: '❌ MISSING',
          issue: 'Table does not exist'
        });
        continue;
      }
      
      // Check columns
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${table.name}
        ORDER BY ordinal_position
      `;
      
      const columnNames = columns.map(c => c.column_name);
      const missingColumns = table.requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        results.push({
          table: table.name,
          status: '⚠️ INCOMPLETE',
          issue: `Missing columns: ${missingColumns.join(', ')}`,
          columns: columnNames
        });
      } else {
        results.push({
          table: table.name,
          status: '✅ OK',
          columns: columnNames
        });
      }
    } catch (error) {
      results.push({
        table: table.name,
        status: '❌ ERROR',
        issue: error.message
      });
    }
  }
  
  // Print results
  console.log('Results:\n');
  results.forEach(result => {
    console.log(`${result.status} ${result.table}`);
    if (result.issue) {
      console.log(`   Issue: ${result.issue}`);
    }
    if (result.columns) {
      console.log(`   Columns: ${result.columns.length}`);
    }
    console.log('');
  });
  
  // Summary
  const ok = results.filter(r => r.status === '✅ OK').length;
  const issues = results.filter(r => r.status !== '✅ OK').length;
  
  console.log(`\n📊 Summary: ${ok}/${requiredTables.length} tables OK, ${issues} with issues`);
  
  if (issues > 0) {
    console.log('\n💡 Run migration: migrations/018_create_file_storage_tables.sql');
    process.exit(1);
  } else {
    console.log('\n✅ All file storage tables are properly configured!');
    process.exit(0);
  }
}

verifyTables().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});






