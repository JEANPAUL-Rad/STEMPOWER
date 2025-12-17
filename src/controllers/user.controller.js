import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from '../config/db.js';
import { createEnrollment } from '../models/enrollment.model.js';
import {
  confirmUser,
  createUser, findUserByEmail,
  findUserByResetToken,
  setPasswordResetToken,
  updateUserPassword
} from '../models/user.model.js';
import { sendConfirmEmail, sendResetPasswordEmail, sendTemporaryPasswordEmail } from '../services/mailService.js';
import { sendMail } from '../utils/email.js';

// Register: Set status to 'pending' and send confirmation email
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await createUser({ name, email, password, role, status: 'pending' });

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Send confirmation email asynchronously - don't block account creation if email fails
    // Wrap in try-catch to prevent any unhandled rejections
    sendConfirmEmail(user.email, user.name, token).catch(err => {
      console.error('Failed to send confirmation email (account still created):', err.message);
    });

    // Always return success response - email is sent asynchronously
    return res.status(201).json({ 
      message: 'Registered. Please check your email to confirm.', 
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Failed to create account. Please try again.' });
  }
};

// Payment status for dashboard - gets data from register table
const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Get user info
    const userRows = await sql`
      SELECT user_id, status, email, role
      FROM users
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (userRows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = userRows[0];

    // First, ensure any registrations are linked to this user
    await sql`UPDATE register SET user_id = ${userId} WHERE email_address = ${user.email} AND user_id IS NULL`;

    // Get latest paid registration from register table (case-insensitive check)
    const paidRegistrations = await sql`
      SELECT id, payment_status, updated_at, created_at, payment_amount, payment_reference
      FROM register 
      WHERE (user_id = ${userId} OR email_address = ${user.email})
        AND UPPER(payment_status) = 'PAID'
      ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
      LIMIT 1
    `;

    // Also check if user has any registration at all (for better error messages)
    const allRegistrations = await sql`
      SELECT id, payment_status, created_at
      FROM register 
      WHERE (user_id = ${userId} OR email_address = ${user.email})
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const now = new Date();
    let lastPaymentDate = null;
    let daysSince = null;
    let blockOn = null;
    let daysUntilBlock = null;
    let paymentAmount = null;
    let paymentReference = null;

    if (paidRegistrations.length > 0) {
      const reg = paidRegistrations[0];
      // Use updated_at if available (when payment was confirmed), otherwise use created_at
      lastPaymentDate = reg.updated_at || reg.created_at;
      paymentAmount = reg.payment_amount;
      paymentReference = reg.payment_reference;

      if (lastPaymentDate) {
        const lastPayment = new Date(lastPaymentDate);
        const diffMs = now.getTime() - lastPayment.getTime();
        daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        blockOn = new Date(lastPayment.getTime() + 30 * 24 * 60 * 60 * 1000);
        const remainingMs = blockOn.getTime() - now.getTime();
        daysUntilBlock = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
      }
    }

    const isAdmin = user.role === 'admin';
    let computedStatus = user.status;
    if (!isAdmin) {
      if (!lastPaymentDate) {
        computedStatus = 'blocked';
      } else {
        computedStatus = (typeof daysUntilBlock === 'number' && daysUntilBlock > 0) ? 'active' : 'blocked';
      }
    }

    return res.json({
      user_id: user.user_id,
      status: computedStatus,
      last_payment_date: lastPaymentDate ? new Date(lastPaymentDate).toISOString() : null,
      payment_amount: paymentAmount,
      payment_reference: paymentReference,
      block_on: blockOn ? blockOn.toISOString() : null,
      days_since_payment: daysSince,
      days_until_block: daysUntilBlock,
      has_paid_registration: paidRegistrations.length > 0,
      has_registration: allRegistrations.length > 0,
      registration_status: allRegistrations.length > 0 ? allRegistrations[0].payment_status : null
    });
  } catch (error) {
    console.error('getPaymentStatus error:', error);
    console.error('Error details:', error.stack);
    return res.status(500).json({ message: 'Failed to load payment status', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Confirm: Set status to 'active' and create enrollments for paid registrations
const confirm = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await confirmUser(decoded.email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // After confirming user, check for paid registrations and create enrollments
    try {
      // Find all paid registrations for this user's email
      const paidRegistrations = await sql`
        SELECT id, module, payment_status 
        FROM register 
        WHERE email_address = ${user.email} 
          AND payment_status = 'Paid' 
          AND module IS NOT NULL
      `;
      
      // Update register with user_id
      await sql`UPDATE register SET user_id = ${user.user_id} WHERE email_address = ${user.email}`;
      
      // Create enrollments for each paid registration
      // NOTE: Only ONE active enrollment is allowed per user
      // If multiple registrations exist, only the most recent will be active
      if (paidRegistrations.length > 0) {
        // Sort by registration ID (most recent first)
        const sortedRegistrations = paidRegistrations.sort((a, b) => b.id - a.id);
        
        // Check if user already has any active enrollments
        const existingActiveEnrollments = await sql`
          SELECT enrollment_id, module FROM enrollments 
          WHERE user_id = ${user.user_id} AND status = 'active'
        `;
        
        // If user has active enrollment in different module, cancel it
        if (existingActiveEnrollments.length > 0) {
          for (const existing of existingActiveEnrollments) {
            const matchingRegistration = sortedRegistrations.find(r => r.module === existing.module);
            if (!matchingRegistration) {
              // Cancel enrollment that doesn't match any paid registration
              await sql`
                UPDATE enrollments 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE enrollment_id = ${existing.enrollment_id}
              `;
              console.log(`⚠️ Cancelled enrollment in module "${existing.module}" for user ${user.user_id}`);
            }
          }
        }
        
        // Create enrollment for the most recent paid registration
        const mostRecentRegistration = sortedRegistrations[0];
        try {
          await createEnrollment({
            user_id: user.user_id,
            registration_id: mostRecentRegistration.id,
            module: mostRecentRegistration.module,
            status: 'active'
          });
          console.log(`✓ Enrollment created for user ${user.user_id} in module ${mostRecentRegistration.module} after email confirmation`);
        } catch (enrollmentError) {
          console.error(`Error creating enrollment for registration ${mostRecentRegistration.id}:`, enrollmentError);
        }
      }
    } catch (enrollmentError) {
      console.error('Error processing enrollments during confirmation:', enrollmentError);
      // Don't fail confirmation if enrollment creation fails
    }
    
    res.json({ message: 'Email confirmed. Awaiting admin approval.' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

// Login: Only allow status === 'active' and check payment status
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  if (user.status !== 'active') {
    const statusMessages = {
      'pending': 'Account pending admin approval.',
      'blocked': 'Account is blocked. Contact admin.'
    };
    return res.status(403).json({ 
      message: statusMessages[user.status] || `Account status: ${user.status}.` 
    });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  // Check payment status from register table
  try {
    // First, ensure any registrations are linked to this user
    await sql`UPDATE register SET user_id = ${user.user_id} WHERE email_address = ${user.email} AND user_id IS NULL`;
    
    // Get latest paid registration for this user (case-insensitive check)
    const paidRegistrations = await sql`
      SELECT id, payment_status, updated_at, created_at
      FROM register 
      WHERE (user_id = ${user.user_id} OR email_address = ${user.email})
        AND UPPER(payment_status) = 'PAID'
      ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
      LIMIT 1
    `;

    // If no paid registration found, block the user
    if (paidRegistrations.length === 0) {
      await sql`UPDATE users SET status = 'blocked' WHERE user_id = ${user.user_id}`;
      return res.status(403).json({ 
        message: 'Account blocked. No payment record found. Please complete registration and payment.' 
      });
    }

    const lastPaidRegistration = paidRegistrations[0];
    // Use updated_at if available (when payment was confirmed), otherwise use created_at
    const lastPaymentDate = lastPaidRegistration.updated_at || lastPaidRegistration.created_at;
    
    if (!lastPaymentDate) {
      await sql`UPDATE users SET status = 'blocked' WHERE user_id = ${user.user_id}`;
      return res.status(403).json({ 
        message: 'Account blocked. Invalid payment record.' 
      });
    }

    // Check if payment is within 30 days
    const now = new Date();
    const paymentDate = new Date(lastPaymentDate);
    const daysSincePayment = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

    // If payment is more than 30 days old, block the user
    if (daysSincePayment > 30) {
      await sql`UPDATE users SET status = 'blocked' WHERE user_id = ${user.user_id}`;
      // Update last_payment_date in users table for tracking
      await sql`UPDATE users SET last_payment_date = ${lastPaymentDate} WHERE user_id = ${user.user_id}`;
      return res.status(403).json({ 
        message: `Account blocked. Payment expired. Last payment was ${daysSincePayment} days ago. Please make a new payment.` 
      });
    }

    // Update last_payment_date in users table for tracking
    await sql`UPDATE users SET last_payment_date = ${lastPaymentDate} WHERE user_id = ${user.user_id}`;
  } catch (paymentCheckError) {
    console.error('Error checking payment status during login:', paymentCheckError);
    // Don't block login if payment check fails, but log the error
  }

  // Ensure registrations are linked to this user and enrollments are created
  try {
    // Link any unlinked registrations for this email
    await sql`UPDATE register SET user_id = ${user.user_id} WHERE email_address = ${user.email} AND user_id IS NULL`;
    
    // Check for paid registrations without enrollments (case-insensitive)
    const paidRegistrations = await sql`
      SELECT id, module, payment_status 
      FROM register 
      WHERE email_address = ${user.email} 
        AND UPPER(payment_status) = 'PAID' 
        AND module IS NOT NULL
    `;
    
    // Create enrollments for any paid registrations without active enrollments
    for (const reg of paidRegistrations) {
      const existingEnrollment = await sql`
        SELECT enrollment_id FROM enrollments 
        WHERE user_id = ${user.user_id} 
          AND registration_id = ${reg.id} 
          AND status = 'active'
        LIMIT 1
      `;
      
      if (existingEnrollment.length === 0) {
        try {
          // Cancel any existing active enrollments in different modules
          await sql`
            UPDATE enrollments 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${user.user_id} 
              AND status = 'active' 
              AND module != ${reg.module}
          `;
          
          // Create enrollment
          await createEnrollment({
            user_id: user.user_id,
            registration_id: reg.id,
            module: reg.module,
            status: 'active'
          });
          console.log(`✅ Enrollment created on login for user ${user.user_id} in module "${reg.module}"`);
        } catch (enrollErr) {
          console.error(`Error creating enrollment for registration ${reg.id}:`, enrollErr);
        }
      }
    }
  } catch (linkErr) {
    console.error('Error linking registrations/enrollments on login:', linkErr);
    // Don't fail login if linking fails
  }

  const token = jwt.sign(
    { user_id: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );

  // Set session data
  req.session.user = {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  res.json({ 
    token,
    user: { 
      user_id: user.user_id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    },
    // Include active enrollment module for convenience
    enrolled_module: (await (async () => {
      try {
        const result = await sql`SELECT module FROM enrollments WHERE user_id = ${user.user_id} AND status = 'active' ORDER BY enrolled_at DESC LIMIT 1`;
        if (result.length > 0) {
          return result[0].module;
        }
        // Fallback to latest registration module if no active enrollment
        const reg = await sql`SELECT module FROM register WHERE (user_id = ${user.user_id} OR email_address = ${user.email}) AND module IS NOT NULL ORDER BY created_at DESC LIMIT 1`;
        return reg.length > 0 ? reg[0].module : null;
      } catch (e) {
        return null;
      }
    })())
  });
};

// Logout: Clear session
const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
};

// Check session status
const checkSession = (req, res) => {
  if (req.session.user) {
    return res.json({ 
      isAuthenticated: true, 
      user: req.session.user 
    });
  }
  res.json({ isAuthenticated: false });
};

// Forgot Password: Send reset link
const forgotPassword = async (req, res) => {
  let email = '';
  let mode = '';
  if (typeof req.body === 'string') {
    const raw = String(req.body).trim();
    try {
      const parsed = JSON.parse(raw);
      email = String(parsed.email || '').trim();
      mode = String(parsed.mode || '').trim();
    } catch {
      // Fallback: extract email from raw text even if JSON is invalid
      const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      email = match ? match[0] : raw;
    }
  } else {
    email = String((req.body?.email || req.query?.email || '')).trim();
    mode = String(req.body?.mode || '').trim();
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const preferTemp = (process.env.FORGOT_PASSWORD_MODE || 'temp').toLowerCase() === 'temp' || mode === 'temp';
  const user = await findUserByEmail(email);
  try {
    if (!user) {
      // Always respond success to avoid leaking which emails exist
      return res.json({ message: preferTemp ? 'Temporary password generated.' : 'If an account exists with that email, a reset link has been sent.' });
    }

    if (preferTemp) {
      const tempPassword = Math.random().toString(36).slice(-10);
      try {
        Promise.resolve().then(() => sendTemporaryPasswordEmail({ email: user.email, name: user.name, tempPassword })).catch(err => {
          console.error('Failed to send temporary password email:', err.message);
        });
        const hash = await bcrypt.hash(tempPassword, 10);
        await updateUserPassword(user.user_id, hash);
        await setPasswordResetToken(user.user_id, null, null);
        return res.json({
          message: 'Temporary password sent to your email. Use it to login, then change your password.'
        });
      } catch (err) {
        return res.status(500).json({ message: 'Failed to process temporary password' });
      }
    }

    // Default: generate reset link via token
    let reset_url = undefined;
    const resetToken = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await setPasswordResetToken(user.user_id, resetToken, expiresAt);
    
    const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    reset_url = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;
    
    sendResetPasswordEmail(user.email, user.name, resetToken).catch(err => {
      console.error('Failed to send reset password email:', err.message);
    });
    const shouldIncludeUrl = process.env.SHOW_RESET_LINK_INLINE === 'true' || process.env.NODE_ENV !== 'production';
    return res.json({ 
      message: "If an account exists with that email, a reset link has been sent.",
      ...(shouldIncludeUrl && reset_url ? { reset_url } : {})
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Failed to process password reset' });
  }
};

// Reset Password: Set new password using token
const resetPassword = async (req, res) => {
  const { token, new_password } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserByResetToken(token);
    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });
    
    const hash = await bcrypt.hash(new_password, 10);
    await updateUserPassword(user.user_id, hash);
    res.json({ message: "Password reset successfully." });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired token.' });
  }
};

// Admin-only: Diagnose email configuration and attempt a test send
const diagnoseEmail = async (req, res) => {
  try {
    const brevoConfigured = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
    const method = brevoConfigured ? 'Brevo' : (smtpConfigured ? 'SMTP' : 'none');
    const to = process.env.TEST_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER;
    const subject = 'Email diagnostics';
    const html = `<h3>Email diagnostics</h3><p>Method: ${method}</p><p>Time: ${new Date().toISOString()}</p>`;

    const info = { method, brevoConfigured, smtpConfigured, to };
    if (!to) {
      return res.status(200).json({ ok: false, info, message: 'No recipient email found; set TEST_EMAIL or BREVO_SENDER_EMAIL or SMTP_USER' });
    }
    try {
      await sendMail(to, subject, html);
      return res.status(200).json({ ok: true, info, message: 'Diagnostic email sent' });
    } catch (e) {
      return res.status(200).json({ ok: false, info, message: e.message });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
};

export default {
  register,
  confirm,
  login,
  logout,
  checkSession,
  forgotPassword,
  resetPassword,
  getPaymentStatus,
  diagnoseEmail
};
