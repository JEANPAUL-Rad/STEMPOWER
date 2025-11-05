// src/controllers/register.controller.js
import sql from '../config/db.js';
import {
    createRegistration,
    deleteRegistration,
    getRegistrationById,
    listRegistrations,
    updatePayment,
    updateRegistration
} from '../models/register.model.js';
import { sendPaymentInstructionsEmail, sendPaymentStatusEmail } from '../services/mailService.js';
import { createEnrollment } from '../models/enrollment.model.js';
import { findUserByEmail } from '../models/user.model.js';

const tryParseBody = (body) => {
	if (typeof body === 'string') {
		try { return JSON.parse(body); } catch { return {}; }
	}
	return body || {};
};

export const create = async (req, res) => {
	try {
		const body = tryParseBody(req.body);
		if (!req.body || Object.keys(body).length === 0) {
			return res.status(400).json({ message: 'Request body is required (send JSON with Content-Type: application/json)' });
		}

		const {
			full_name,
			email_address,
			contact_number,
			level_of_archicad_skills,
			module,
			payment_amount,
			payment_method
		} = body;

		if (!full_name || !email_address || !level_of_archicad_skills) {
			return res.status(400).json({ message: 'full_name, email_address and level_of_archicad_skills are required' });
		}

		const allowedLevels = ['Not good', 'Good', 'Excellent'];
		if (!allowedLevels.includes(level_of_archicad_skills)) {
			return res.status(400).json({ message: `level_of_archicad_skills must be one of: ${allowedLevels.join(', ')}` });
		}

		if (!payment_method || typeof payment_method !== 'string' || payment_method.trim() === '') {
			return res.status(400).json({ message: 'payment_method is required' });
		}

		// Check if user already has an active enrollment in a different module
		// Users can only enroll in ONE module at a time
		const existingUser = await findUserByEmail(email_address);
		if (existingUser && existingUser.user_id) {
			const activeEnrollments = await sql`
				SELECT module FROM enrollments 
				WHERE user_id = ${existingUser.user_id} AND status = 'active'
				LIMIT 1
			`;
			
			if (activeEnrollments.length > 0) {
				const existingModule = activeEnrollments[0].module;
				if (existingModule !== module) {
					return res.status(409).json({ 
						message: `You are already enrolled in "${existingModule}". Users can only enroll in one module at a time. To enroll in "${module}", please contact support to cancel your current enrollment first.`,
						existing_module: existingModule,
						requested_module: module
					});
				}
				// If same module, allow re-registration (update existing)
			}
		}


		const registration = await createRegistration({
			full_name,
			email_address,
			contact_number,
			level_of_archicad_skills,
			module,
			payment_amount: typeof payment_amount === 'number' ? payment_amount : 30000,
			payment_method,
			payment_reference: null,
			payment_status: 'Pending'
		});

		// Link user_id if user exists (user may have registered account before course registration)
		let finalRegistration = registration;
		if (existingUser && existingUser.user_id) {
			try {
				await sql`UPDATE register SET user_id = ${existingUser.user_id} WHERE id = ${registration.id}`;
				finalRegistration = { ...registration, user_id: existingUser.user_id };
				
				// If payment is already Paid, create enrollment immediately
				if (registration.payment_status === 'Paid' && module) {
					try {
						await createEnrollment({
							user_id: existingUser.user_id,
							registration_id: registration.id,
							module: module,
							status: 'active'
						});
						console.log(`✅ Enrollment created immediately for user ${existingUser.user_id} in module "${module}"`);
					} catch (enrollErr) {
						console.error('Error creating immediate enrollment:', enrollErr);
					}
				}
			} catch (linkErr) {
				console.error('Error linking user_id to registration:', linkErr);
			}
		}

		// Email payment instructions with reference code
		try {
			const payToName = process.env.PAY_TO_NAME || 'NKUSI ENGINEERING GROUP LTD';
			const payToNumber = process.env.PAY_TO_NUMBER || '0795813936';
			await sendPaymentInstructionsEmail({
				email: email_address,
				name: full_name,
				amount: finalRegistration.payment_amount,
				reference: finalRegistration.payment_reference,
				payToName,
				payToNumber
			});
		} catch (e) {
			console.error('Email send failed:', e);
		}

		const toast = `Registration successful go on you email . Please pay fees to 
        ${process.env.PAY_TO_NAME || 'NKUSI ENGINEERING GROUP LTD'} 
        to Press ${process.env.PAY_TO_NUMBER || '*182*1*1*0795813936#'}.`;
		return res.status(201).json({ ...finalRegistration, toast_message: toast });
	} catch (error) {
		console.error('Error creating registration:', error);
		// Unique violation (e.g., email)
		if (error?.code === '23505') {
			return res.status(409).json({ message: 'Email already registered' });
		}
		// Check constraint violation
		if (error?.code === '23514') {
			return res.status(400).json({ message: 'Invalid data: violates a check constraint' });
		}
		const devInfo = process.env.NODE_ENV !== 'production' ? { code: error?.code, detail: error?.detail, hint: error?.hint, routine: error?.routine, message: error?.message } : undefined;
		return res.status(500).json({ message: 'Failed to create registration', ...(devInfo ? { error: devInfo } : {}) });
	}
};

export const getById = async (req, res) => {
	try {
		const { id } = req.params;
		const registration = await getRegistrationById(id);
		if (!registration) return res.status(404).json({ message: 'Registration not found' });
		return res.json(registration);
	} catch (error) {
		console.error('Error fetching registration:', error);
		return res.status(500).json({ message: 'Failed to fetch registration' });
	}
};

export const list = async (req, res) => {
	try {
		const limit = Number(req.query.limit) || 50;
		const offset = Number(req.query.offset) || 0;
		const registrations = await listRegistrations({ limit, offset });
		
		// Enhance registrations with enrollment status, user info, and module stats
		const registrationsWithEnrollment = await Promise.all(
			registrations.map(async (reg) => {
				try {
					// Get user info if user_id exists
					let userInfo = null;
					if (reg.user_id) {
						try {
							const user = await sql`
								SELECT user_id, name, email, role, status as user_status
								FROM users 
								WHERE user_id = ${reg.user_id}
								LIMIT 1
							`;
							if (user.length > 0) {
								userInfo = user[0];
							}
						} catch (userError) {
							console.error(`Error fetching user info for registration ${reg.id}:`, userError);
							// Continue without user info
						}
					}

				// Enrollment is automatically active when payment is paid - no need to check status
				// Just mark if enrollment exists
				let hasEnrollment = false;
				let enrolledAt = null;
				
				if (reg.payment_status === 'Paid' && reg.module) {
					try {
						// Check if enrollment exists (automatically active when paid)
						let enrollmentData = [];
						
						if (reg.user_id) {
							// User has an account - check by user_id + module
							enrollmentData = await sql`
								SELECT enrolled_at 
								FROM enrollments 
								WHERE user_id = ${reg.user_id}
									AND module = ${reg.module}
									AND status = 'active'
								ORDER BY enrolled_at DESC
								LIMIT 1
							`;
						}
						
						// If not found by user_id, try registration_id
						if (enrollmentData.length === 0) {
							enrollmentData = await sql`
								SELECT enrolled_at 
								FROM enrollments 
								WHERE registration_id = ${reg.id}
									AND module = ${reg.module}
									AND status = 'active'
								ORDER BY enrolled_at DESC
								LIMIT 1
							`;
						}
						
						if (enrollmentData.length > 0) {
							hasEnrollment = true;
							enrolledAt = enrollmentData[0].enrolled_at;
						}
					} catch (enrollmentError) {
						console.error(`Error fetching enrollment for registration ${reg.id}:`, enrollmentError);
						// Continue without enrollment info
					}
				}

				// Module stats removed from admin view - only shown on user dashboard
				
				return {
					...reg,
					user: userInfo,
					module_title: reg.module, // Add module_title for clarity
					enrolled_at: enrolledAt,
					has_enrollment: hasEnrollment
				};
				} catch (regError) {
					console.error(`Error processing registration ${reg.id}:`, regError);
					// Return basic registration data if enhancement fails
					return {
						...reg,
						module_title: reg.module,
						user: null,
						enrolled_at: null,
						has_enrollment: false,
						module_stats: null
					};
				}
			})
		);
		
		return res.json(registrationsWithEnrollment);
	} catch (error) {
		console.error('Error listing registrations:', error);
		console.error('Error stack:', error.stack);
		return res.status(500).json({ 
			message: 'Failed to list registrations',
			error: process.env.NODE_ENV !== 'production' ? error.message : undefined
		});
	}
};

export const updatePaymentStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const body = tryParseBody(req.body);
		if (!req.body || Object.keys(body).length === 0) {
			return res.status(400).json({ message: 'Request body is required (send JSON with Content-Type: application/json)' });
		}
		const { payment_status, payment_reference, payment_method, payment_amount } = body;

		const updated = await updatePayment(id, { payment_status, payment_reference, payment_method, payment_amount });
		if (!updated) return res.status(404).json({ message: 'Registration not found' });

		// If payment is confirmed, create enrollment for the user
		if (updated.payment_status === 'Paid' && updated.module) {
			try {
				// Check if user exists
				let user_id = updated.user_id;
				
				// If user_id is not set, try to find user by email
				if (!user_id) {
					const user = await findUserByEmail(updated.email_address);
					if (user) {
						user_id = user.user_id;
						// Update register with user_id
						await sql`UPDATE register SET user_id = ${user_id} WHERE id = ${id}`;
					} else {
						// User doesn't exist yet - log this for later enrollment creation
						console.log(`Payment confirmed for registration ${id}, but user account doesn't exist yet. Enrollment will be created when user confirms their account.`);
						// Note: Enrollment will be created when user confirms their email/account
						return res.json(updated);
					}
				}
				
				// Create enrollment if user_id exists and module is set
				if (user_id && updated.module) {
					// Check if enrollment already exists for this registration
					const existingEnrollmentForReg = await sql`
						SELECT enrollment_id FROM enrollments 
						WHERE user_id = ${user_id} AND module = ${updated.module} AND status = 'active'
						LIMIT 1
					`;
					
					if (existingEnrollmentForReg.length === 0) {
						// Check if user already has an active enrollment in a different module
						const existingActiveEnrollments = await sql`
							SELECT enrollment_id, module FROM enrollments 
							WHERE user_id = ${user_id} AND status = 'active' AND module != ${updated.module}
						`;
						
						if (existingActiveEnrollments.length > 0) {
							const existingModule = existingActiveEnrollments[0].module;
							// Cancel existing enrollments in other modules
							await sql`
								UPDATE enrollments 
								SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
								WHERE user_id = ${user_id} AND status = 'active' AND module != ${updated.module}
							`;
							console.log(`⚠️ User ${user_id} had active enrollment in "${existingModule}" - cancelled to enroll in "${updated.module}"`);
						}
						
						// Create enrollment using createEnrollment (which handles cancellation)
						try {
							const enrollment = await createEnrollment({
								user_id: user_id,
								registration_id: parseInt(id),
								module: updated.module,
								status: 'active'
							});
							console.log(`✅ Enrollment created for user ${user_id} in module "${updated.module}" (Enrollment ID: ${enrollment?.enrollment_id || 'N/A'})`);
							console.log(`   Registration ID: ${id}, Module: ${updated.module}`);
						} catch (enrollmentErr) {
							console.error(`❌ Failed to create enrollment:`, enrollmentErr);
							throw enrollmentErr; // Re-throw to be caught by outer catch
						}
					} else {
						console.log(`ℹ️ Enrollment already exists for user ${user_id} in module "${updated.module}"`);
					}
				} else {
					if (!user_id) {
						console.warn(`⚠️ Cannot create enrollment: user_id is missing for registration ${id}. Enrollment will be created when user confirms email.`);
					} else if (!updated.module) {
						console.warn(`⚠️ Cannot create enrollment: module is missing for registration ${id}`);
					}
				}
			} catch (enrollmentError) {
				// Log error but don't fail the payment update
				console.error('❌ Error creating enrollment:', enrollmentError);
				console.error('Error details:', {
					message: enrollmentError.message,
					code: enrollmentError.code,
					detail: enrollmentError.detail,
					registration_id: id,
					module: updated.module,
					user_id: updated.user_id
				});
			}
		}

		// SMS notification (if SMS service is configured)
		// Uncomment and configure if SMS service is available
		// if (updated.contact_number && isSMSConfigured()) {
		// 	let body = `Hi ${updated.full_name}, your payment status is now ${updated.payment_status}.`;
		// 	if (updated.payment_status === 'Paid') {
		// 		body = `Hi ${updated.full_name}, payment of ${updated.payment_amount} confirmed. Thank you!`;
		// 	} else if (updated.payment_status === 'Failed') {
		// 		body = `Hi ${updated.full_name}, your payment failed. Please retry with reference ${updated.payment_reference || ''}.`;
		// 	}
		// 	sendSMS({ to: updated.contact_number, body }).catch(err => console.error('SMS send failed:', err));
		// }
		// Email payment status
		try {
			await sendPaymentStatusEmail({
				email: updated.email_address,
				name: updated.full_name,
				status: updated.payment_status,
				amount: updated.payment_amount,
				reference: updated.payment_reference
			});
		} catch (e) {
			console.error('Payment status email failed:', e);
		}
		return res.json(updated);
	} catch (error) {
		console.error('Error updating payment:', error);
		return res.status(500).json({ message: 'Failed to update payment' });
	}
};

export const update = async (req, res) => {
	try {
		const { id } = req.params;
		const body = tryParseBody(req.body);
		
		const { full_name, email_address, contact_number, level_of_archicad_skills, module, payment_amount } = body;
		
		// Get the original registration to check for module changes
		const originalRegistration = await getRegistrationById(id);
		if (!originalRegistration) {
			return res.status(404).json({ message: 'Registration not found' });
		}
		
		const updated = await updateRegistration(id, {
			full_name,
			email_address,
			contact_number,
			level_of_archicad_skills,
			module,
			payment_amount
		});
		
		if (!updated) {
			return res.status(404).json({ message: 'Registration not found' });
		}
		
		// CRITICAL: If module changed OR if payment is Paid and enrollment doesn't exist, sync enrollments
		const moduleChanged = module && module !== originalRegistration.module;
		const needsEnrollmentSync = moduleChanged || (updated.payment_status === 'Paid' && updated.module);
		
		if (needsEnrollmentSync && updated.module) {
			try {
				// Get user_id (may need to find by email if not set)
				let user_id = updated.user_id;
				
				// If user_id is not set, try to find user by email
				if (!user_id) {
					const user = await findUserByEmail(updated.email_address);
					if (user) {
						user_id = user.user_id;
						// Update register with user_id
						await sql`UPDATE register SET user_id = ${user_id} WHERE id = ${id}`;
						updated.user_id = user_id;
					}
				}
				
				// If we have user_id and module, sync enrollment
				if (user_id && updated.module) {
					// Check if enrollment exists for this registration
					const existingEnrollment = await sql`
						SELECT enrollment_id, module, status FROM enrollments 
						WHERE registration_id = ${id} OR (user_id = ${user_id} AND status = 'active')
						ORDER BY enrolled_at DESC
						LIMIT 1
					`;
					
					const hasExistingEnrollment = existingEnrollment.length > 0;
					const existingModule = hasExistingEnrollment ? existingEnrollment[0].module : null;
					const moduleNeedsUpdate = hasExistingEnrollment && existingModule !== updated.module;
					
					// If module changed and enrollment exists with old module, cancel it
					if (moduleNeedsUpdate) {
						await sql`
							UPDATE enrollments 
							SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
							WHERE enrollment_id = ${existingEnrollment[0].enrollment_id}
						`;
						console.log(`⚠️ Cancelled enrollment in old module "${existingModule}" for user ${user_id}`);
					}
					
					// If payment is Paid, create/update enrollment with new module
					if (updated.payment_status === 'Paid') {
						// Check if enrollment already exists for the new module
						const existingEnrollmentForNewModule = await sql`
							SELECT enrollment_id FROM enrollments 
							WHERE user_id = ${user_id} AND module = ${updated.module} AND status = 'active'
							LIMIT 1
						`;
						
						if (existingEnrollmentForNewModule.length === 0) {
							// Cancel any other active enrollments in different modules
							await sql`
								UPDATE enrollments 
								SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
								WHERE user_id = ${user_id} AND status = 'active' AND module != ${updated.module}
							`;
							
							// Create new enrollment with updated module
							const enrollment = await createEnrollment({
								user_id: user_id,
								registration_id: parseInt(id),
								module: updated.module,
								status: 'active'
							});
							console.log(`✅ Enrollment created/updated for user ${user_id} in module "${updated.module}" (Enrollment ID: ${enrollment?.enrollment_id || 'N/A'})`);
							console.log(`   Registration ID: ${id}, Module: ${updated.module}`);
						} else {
							// Update existing enrollment registration_id if needed
							if (existingEnrollmentForNewModule[0].enrollment_id && 
								(!hasExistingEnrollment || existingEnrollment[0].registration_id !== parseInt(id))) {
								await sql`
									UPDATE enrollments 
									SET registration_id = ${id}, updated_at = CURRENT_TIMESTAMP
									WHERE enrollment_id = ${existingEnrollmentForNewModule[0].enrollment_id}
								`;
								console.log(`✅ Updated enrollment registration_id for user ${user_id} in module "${updated.module}"`);
							} else {
								console.log(`ℹ️ Enrollment already exists for user ${user_id} in module "${updated.module}"`);
							}
						}
					} else if (moduleNeedsUpdate && updated.payment_status !== 'Paid') {
						// If module changed but payment not Paid, cancel old enrollment
						// (Enrollment will be created when payment becomes Paid)
						console.log(`ℹ️ Module changed but payment not Paid - enrollment will be created when payment is confirmed`);
					}
				} else {
					if (!user_id) {
						console.warn(`⚠️ Cannot sync enrollment: user_id is missing for registration ${id}. Enrollment will be created when user confirms email.`);
					} else if (!updated.module) {
						console.warn(`⚠️ Cannot sync enrollment: module is missing for registration ${id}`);
					}
				}
			} catch (enrollmentError) {
				// Log error but don't fail the registration update
				console.error('❌ Error syncing enrollment after module update:', enrollmentError);
				console.error('Error details:', {
					message: enrollmentError.message,
					code: enrollmentError.code,
					detail: enrollmentError.detail,
					registration_id: id,
					module: updated.module,
					user_id: updated.user_id
				});
			}
		}
		
		return res.json({ message: 'Registration updated successfully', data: updated });
	} catch (error) {
		console.error('Error updating registration:', error);
		if (error?.code === '23505') {
			return res.status(409).json({ message: 'Email already exists' });
		}
		return res.status(500).json({ message: 'Failed to update registration', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
	}
};

export const deleteById = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await deleteRegistration(id);
		if (!deleted) return res.status(404).json({ message: 'Registration not found' });
		return res.json({ message: 'Registration deleted successfully', data: deleted });
	} catch (error) {
		console.error('Error deleting registration:', error);
		return res.status(500).json({ message: 'Failed to delete registration' });
	}
};


