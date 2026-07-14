import { listPublications } from './src/models/admin/publication.model.js';

async function test() {
  try {
    console.log('Calling listPublications...');
    const pubs = await listPublications();
    console.log('Result:', JSON.stringify(pubs, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

test();
