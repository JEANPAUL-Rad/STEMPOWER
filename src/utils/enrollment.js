// utils/enrollment.js
// Utility functions for enrollment management
import sql from '../config/db.js';
import { createEnrollment } from '../models/enrollment.model.js';

/**
 * Get enrolled modules for a user
 * IMPORTANT: Users can only have ONE active enrollment at a time
 * Returns only the most recent active enrollment module
 * @param {number} user_id - User ID
 * @returns {Promise<Array<string>>} Array with single module name (or empty array)
 */
export async function getUserEnrolledModules(user_id) {
  try {
    // First, try to get from enrollments table
    let enrollments;
    try {
      // Get the most recent active enrollment for this user.
      // NOTE: We intentionally avoid SELECT DISTINCT here because PostgreSQL
      // does not allow ORDER BY on columns that are not in the DISTINCT list,
      // which was causing: "for SELECT DISTINCT, ORDER BY expressions must appear in select list".
      // Since each enrollment row already represents a specific module at a time,
      // we only need the latest row by enrolled_at.
      enrollments = await sql`
        SELECT module FROM enrollments 
        WHERE user_id = ${user_id} AND status = 'active'
        ORDER BY enrolled_at DESC
        LIMIT 1
      `;
    } catch (enrollError) {
      console.error(`Error querying enrollments table for user ${user_id}:`, enrollError);
      // Continue to fallback
      enrollments = [];
    }
    
    // If no enrollment found, check register table (fallback)
    if (!enrollments || enrollments.length === 0) {
      try {
        // Get user email
        const userInfo = await sql`SELECT email FROM users WHERE user_id = ${user_id} LIMIT 1`;
        const userEmail = userInfo.length > 0 ? userInfo[0].email : null;
        
        if (userEmail) {
          // Try by user_id first - also check for paid registrations
          const registrations = await sql`
            SELECT id, module, payment_status, user_id FROM register 
            WHERE (user_id = ${user_id} OR email_address = ${userEmail})
              AND module IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
          `;
          
          if (registrations.length > 0) {
            const reg = registrations[0];
            
            // Link user_id if not already linked
            if (!reg.user_id) {
              try {
                await sql`
                  UPDATE register 
                  SET user_id = ${user_id} 
                  WHERE id = ${reg.id}
                `;
              } catch (updateError) {
                console.error(`Error updating register.user_id for registration ${reg.id}:`, updateError);
                // Continue anyway
              }
            }
            
            // If payment is Paid, try to create enrollment automatically
            if (reg.payment_status === 'Paid' && reg.module) {
              try {
                // Check if enrollment already exists
                const existingEnroll = await sql`
                  SELECT enrollment_id FROM enrollments 
                  WHERE user_id = ${user_id} AND module = ${reg.module} AND status = 'active'
                  LIMIT 1
                `;
                
                if (existingEnroll.length === 0) {
                  // Create enrollment automatically
                  await createEnrollment({
                    user_id: user_id,
                    registration_id: reg.id,
                    module: reg.module,
                    status: 'active'
                  });
                  console.log(`✅ Auto-created enrollment for user ${user_id} in module "${reg.module}"`);
                  
                  // Return the module immediately after creating enrollment
                  return [reg.module];
                }
              } catch (enrollErr) {
                console.error('Error auto-creating enrollment:', enrollErr);
                // Continue and return module from registration anyway
              }
            }
            
            // Return module from registration (even if payment pending, user should see it)
            if (reg.module) {
              return [reg.module];
            }
          }
        }
      } catch (fallbackError) {
        console.error(`Error in fallback enrollment lookup for user ${user_id}:`, fallbackError);
        // Return empty array if fallback fails
        return [];
      }
    }
    
    // Return modules from enrollments
    if (enrollments && enrollments.length > 0) {
      return enrollments.map(e => e.module).filter(m => m); // Filter out null/undefined
    }
    
    return [];
  } catch (error) {
    console.error(`Critical error in getUserEnrolledModules for user ${user_id}:`, error);
    console.error('Error stack:', error.stack);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Check if user has access to a specific module
 * @param {number} user_id - User ID
 * @param {string} module - Module name
 * @returns {Promise<boolean>} True if user has access
 */
export async function hasAccessToModule(user_id, module) {
  if (!module) return false;

  // Reuse unified enrollment detection (includes enrollments + register fallback)
  const enrolledModules = await getUserEnrolledModules(user_id);
  if (!enrolledModules || enrolledModules.length === 0) {
    return false;
  }

  const target = (module || '').toLowerCase().trim();

  // Student has access if:
  // - They are enrolled in the specific module, OR
  // - They are enrolled in "MEP Design" (super-module, can see all)
  return enrolledModules.some(m => {
    const normalized = (m || '').toLowerCase().trim();
    return normalized === target || normalized === 'mep design';
  });
}

/**
 * Get enrollment details for a user and module
 * @param {number} user_id - User ID
 * @param {string} module - Module name
 * @returns {Promise<Object|null>} Enrollment object or null
 */
export async function getEnrollmentByUserAndModule(user_id, module) {
  const enrollments = await sql`
    SELECT * FROM enrollments 
    WHERE user_id = ${user_id} 
      AND module = ${module} 
      AND status = 'active'
    LIMIT 1
  `;
  return enrollments[0] || null;
}

/**
 * Check if user has any active enrollments
 * @param {number} user_id - User ID
 * @returns {Promise<boolean>} True if user has active enrollments
 */
export async function hasActiveEnrollments(user_id) {
  const enrollments = await sql`
    SELECT 1 FROM enrollments 
    WHERE user_id = ${user_id} 
      AND status = 'active'
    LIMIT 1
  `;
  return enrollments.length > 0;
}


