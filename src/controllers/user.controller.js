import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import sql from '../config/db.js';
import { 
  createUser, findUserByEmail, confirmUser, 
  setPasswordResetToken, findUserByResetToken, updateUserPassword 
} from '../models/user.model.js';
import { sendConfirmEmail, sendResetPasswordEmail } from '../services/mailService.js';
import { createEnrollment } from '../models/enrollment.model.js';

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

// Login: Only allow status === 'active'
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

  // Ensure registrations are linked to this user and enrollments are created
  try {
    // Link any unlinked registrations for this email
    await sql`UPDATE register SET user_id = ${user.user_id} WHERE email_address = ${user.email} AND user_id IS NULL`;
    
    // Check for paid registrations without enrollments
    const paidRegistrations = await sql`
      SELECT id, module, payment_status 
      FROM register 
      WHERE email_address = ${user.email} 
        AND payment_status = 'Paid' 
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
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
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
  const { email } = req.body;
  const user = await findUserByEmail(email);
  if (user) {
    const resetToken = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await setPasswordResetToken(user.user_id, resetToken, expiresAt);
    
    // Send reset email asynchronously - don't block response if email fails
    sendResetPasswordEmail(user.email, user.name, resetToken).catch(err => {
      console.error('Failed to send reset password email:', err.message);
    });
  }
  res.json({ message: "If an account exists with that email, a reset link has been sent." });
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

export default {
  register,
  confirm,
  login,
  logout,
  checkSession,
  forgotPassword,
  resetPassword
};