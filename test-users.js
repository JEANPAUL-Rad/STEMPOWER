import sql from './src/config/db.js';

async function test() {
  try {
    console.log('Checking users table columns...');
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
    console.log('Columns:', cols);

    console.log('\nChecking users table data...');
    const users = await sql`SELECT * FROM users LIMIT 1`;
    console.log('Users:', users);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

test();
