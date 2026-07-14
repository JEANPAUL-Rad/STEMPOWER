import sql from './src/config/db.js';

async function test() {
  try {
    console.log('Testing publications table...');
    const pubs = await sql`SELECT * FROM publications`;
    console.log('Publications:', pubs);

    console.log('\nTesting publication_files table...');
    const files = await sql`SELECT * FROM publication_files`;
    console.log('Files:', files);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

test();
