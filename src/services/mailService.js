// services/mailService.js - Updated with dynamic frontend URL http://localhost:5173
import { sendMail } from '../utils/email.js';

// Get frontend URL from environment variable or use localhost for development
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const sendConfirmEmail = async (email, name, token) => {
  const confirmLink = `${FRONTEND_URL}/confirm?token=${token}`;

  const html = `
    <h2>Welcome to Nkusi Engineering Group Ltd, ${name}!</h2>
    <p>Thank you for registering. Please confirm your email address by clicking the button below:</p>
    <a href="${confirmLink}" style="
      display: inline-block;
      padding: 10px 20px;
      background-color: #007BFF;
      color: white;
      text-decoration: none;
      border-radius: 5px;">Confirm Email</a>
    <p>If you didn't register, you can safely ignore this email.</p>
    <p><small>Having trouble? Copy and paste this link in your browser: ${confirmLink}</small></p>
  `;

  await sendMail(email, 'Confirm Your Email', html);
};

export const sendResetPasswordEmail = async (email, name, token) => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <h2>Password Reset Requested</h2>
    <p>Hello ${name},</p>
    <p>We received a request to reset your password. Click the button below to reset it:</p>
    <a href="${resetLink}" style="
      display: inline-block;
      padding: 10px 20px;
      background-color: #28A745;
      color: white;
      text-decoration: none;
      border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
    <p><small>Having trouble? Copy and paste this link in your browser: ${resetLink}</small></p>
  `;

  await sendMail(email, 'Reset Your Password', html);
};

export const sendPaymentInstructionsEmail = async ({ email, name, amount, reference, payToName, payToNumber }) => {
	const html = `
		<h2>Registration Received</h2>
		<p>Hello ${name},</p>
		<p>Thank you for registering. Please complete your payment to finalize your registration.</p>
		<ul>
			<li><strong>Amount:</strong> ${amount} RWF</li>
			<li><strong>Pay To:</strong> ${payToName} </li>
			
		</ul>
		<p>Use the phone number Press *182*8*1*7930391#.. when paying to ensure your payment is matched.</p>
	`;
	await sendMail(email, 'Complete Your Registration Payment', html);
};

export const sendPaymentStatusEmail = async ({ email, name, status, amount, reference }) => {
	const subject = status === 'Paid' ? 'Payment Confirmed' : (status === 'Failed' ? 'Payment Failed' : 'Payment Update');
	const html = `
		<h2>${subject}</h2>
		<p>Hello ${name},</p>
		<p>Your payment status is now: <strong>${status}</strong>.</p>
		<ul>
			<li><strong>Amount:</strong> ${amount} RWF</li>
			
		</ul>
	`;
	await sendMail(email, subject, html);
};

// Send a temporary password for Protoforial forgot-password
export const sendTemporaryPasswordEmail = async ({ email, name, tempPassword }) => {
  const html = `
    <h2>Temporary Password</h2>
    <p>Hello ${name || ''},</p>
    <p>We generated a temporary password for your  account:</p>
    <p><strong style="font-size: 18px;">${tempPassword}</strong></p>
    <p>Please sign in using this password and then change it from your profile settings.</p>
  `;
  await sendMail(email, 'Your Temporary  Password', html);
};