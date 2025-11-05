// models/enrollment.model.js
// Enrollment model for managing student course enrollments
import sql from '../config/db.js';

/**
 * Create a new enrollment
 * IMPORTANT: Users can only have ONE active enrollment at a time
 * If user already has an active enrollment in a different module, it will be cancelled
 * @param {Object} enrollmentData - Enrollment data
 * @param {number} enrollmentData.user_id - User ID
 * @param {number} enrollmentData.registration_id - Registration ID (optional)
 * @param {string} enrollmentData.module - Module name
 * @param {string} enrollmentData.status - Enrollment status (default: 'active')
 * @returns {Promise<Object>} Created enrollment
 * @throws {Error} If trying to enroll in a different module when already enrolled
 */
export async function createEnrollment({ user_id, registration_id = null, module, status = 'active' }) {
  // Check if user already has an active enrollment in a DIFFERENT module
  const existingActiveEnrollments = await sql`
    SELECT enrollment_id, module FROM enrollments 
    WHERE user_id = ${user_id} AND status = 'active'
  `;
  
  // If user has an active enrollment in a different module, cancel it
  for (const existingEnrollment of existingActiveEnrollments) {
    if (existingEnrollment.module !== module) {
      // Cancel the existing enrollment
      await sql`
        UPDATE enrollments 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE enrollment_id = ${existingEnrollment.enrollment_id}
      `;
      console.log(`⚠️ Cancelled existing enrollment in module "${existingEnrollment.module}" for user ${user_id} - enrolling in new module "${module}"`);
    }
  }
  
  // Create or update enrollment (if same module, just update status)
  const [enrollment] = await sql`
    INSERT INTO enrollments (user_id, registration_id, module, status)
    VALUES (${user_id}, ${registration_id}, ${module}, ${status})
    ON CONFLICT (user_id, module) DO UPDATE
    SET status = EXCLUDED.status,
        registration_id = EXCLUDED.registration_id,
        updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return enrollment;
}

/**
 * Get enrollment by ID
 * @param {number} enrollment_id - Enrollment ID
 * @returns {Promise<Object|null>} Enrollment object or null
 */
export async function getEnrollmentById(enrollment_id) {
  const [enrollment] = await sql`
    SELECT * FROM enrollments WHERE enrollment_id = ${enrollment_id}
  `;
  return enrollment || null;
}

/**
 * Get all enrollments for a user
 * @param {number} user_id - User ID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} Array of enrollments
 */
export async function getEnrollmentsByUser(user_id, status = null) {
  if (status) {
    return await sql`
      SELECT * FROM enrollments 
      WHERE user_id = ${user_id} AND status = ${status}
      ORDER BY enrolled_at DESC
    `;
  }
  return await sql`
    SELECT * FROM enrollments 
    WHERE user_id = ${user_id}
    ORDER BY enrolled_at DESC
  `;
}

/**
 * Get all active enrollments for a user
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} Array of active enrollments
 */
export async function getActiveEnrollmentsByUser(user_id) {
  return await sql`
    SELECT * FROM enrollments 
    WHERE user_id = ${user_id} AND status = 'active'
    ORDER BY enrolled_at DESC
  `;
}

/**
 * Update enrollment status
 * @param {number} enrollment_id - Enrollment ID
 * @param {string} status - New status
 * @returns {Promise<Object|null>} Updated enrollment or null
 */
export async function updateEnrollmentStatus(enrollment_id, status) {
  const [enrollment] = await sql`
    UPDATE enrollments 
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE enrollment_id = ${enrollment_id}
    RETURNING *
  `;
  return enrollment || null;
}

/**
 * Cancel enrollment (set status to 'cancelled')
 * @param {number} enrollment_id - Enrollment ID
 * @returns {Promise<Object|null>} Updated enrollment or null
 */
export async function cancelEnrollment(enrollment_id) {
  return await updateEnrollmentStatus(enrollment_id, 'cancelled');
}

/**
 * Complete enrollment (set status to 'completed')
 * @param {number} enrollment_id - Enrollment ID
 * @returns {Promise<Object|null>} Updated enrollment or null
 */
export async function completeEnrollment(enrollment_id) {
  return await updateEnrollmentStatus(enrollment_id, 'completed');
}

/**
 * Delete enrollment
 * @param {number} enrollment_id - Enrollment ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteEnrollment(enrollment_id) {
  const result = await sql`
    DELETE FROM enrollments WHERE enrollment_id = ${enrollment_id}
  `;
  return result.count > 0;
}


