import dotenv from 'dotenv';
import cloudinary from './src/utils/cloudinary.js';

dotenv.config();

console.log('Testing Cloudinary configuration...');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');

// Test Cloudinary connection
try {
  const result = await cloudinary.api.ping();
  console.log('✅ Cloudinary connection successful:', result);
} catch (error) {
  console.error('❌ Cloudinary connection failed:', error.message);
}
