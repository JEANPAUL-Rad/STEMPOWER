// test-connection.js
import sql from './src/config/db.js';


async function testDB() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connected! Current time:', result[0].current_time);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  } finally {
    process.exit(); // end process after test
  }
}

testDB();
