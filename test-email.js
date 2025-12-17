import dotenv from 'dotenv';
import { sendMail } from './src/utils/email.js';
dotenv.config();

const to = process.env.TEST_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER;
const subject = 'Email service diagnostic';
const html = `
  <h2>Email Diagnostic</h2>
  <p>This is a test message from the backend email utility.</p>
  <p>Time: ${new Date().toISOString()}</p>
`;

const showConfig = () => {
  const brevoConfigured = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
  console.log('Email method (expected):', brevoConfigured ? 'Brevo' : (smtpConfigured ? 'SMTP' : 'none'));
  console.log('To:', to || '(not set)');
};

showConfig();

if (!to) {
  console.error('No recipient email found. Set TEST_EMAIL or BREVO_SENDER_EMAIL or SMTP_USER.');
  process.exit(1);
}

sendMail(to, subject, html)
  .then(() => {
    console.log('Diagnostic email sent successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Diagnostic email failed:', err.message);
    process.exit(1);
  });
