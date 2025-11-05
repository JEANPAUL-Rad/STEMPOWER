// src/models/register.model.js
import sql from '../config/db.js';

export const createRegistration = async ({
	full_name,
	email_address,
	contact_number = null,
	level_of_archicad_skills,
	module = null,
	payment_amount = 0,
	payment_status = 'Pending',
	payment_reference = null,
	payment_method = null
}) => {
	const rows = await sql`
		INSERT INTO register (
			full_name,
			email_address,
			contact_number,
			level_of_archicad_skills,
			module,
			payment_amount,
			payment_status,
			payment_reference,
			payment_method
		) VALUES (
			${full_name},
			${email_address},
			${contact_number},
			${level_of_archicad_skills},
			${module},
			${payment_amount},
			${payment_status},
			${payment_reference},
			${payment_method}
		) RETURNING *
	`;

	return rows[0];
};

export const getRegistrationById = async (id) => {
	const rows = await sql`SELECT * FROM register WHERE id = ${id}`;
	return rows[0] || null;
};

export const listRegistrations = async ({ limit = 50, offset = 0 } = {}) => {
	const rows = await sql`
		SELECT *
		FROM register
		ORDER BY created_at DESC
		LIMIT ${limit} OFFSET ${offset}
	`;
	return rows;
};

export const updatePayment = async (id, { payment_status, payment_reference = null, payment_method = null, payment_amount = null }) => {
	const rows = await sql`
		UPDATE register
		SET
			payment_status = COALESCE(${payment_status}, payment_status),
			payment_reference = COALESCE(${payment_reference}, payment_reference),
			payment_method = COALESCE(${payment_method}, payment_method),
			payment_amount = COALESCE(${payment_amount}, payment_amount)
		WHERE id = ${id}
		RETURNING *
	`;
	return rows[0] || null;
};

export const updateRegistration = async (id, { full_name, email_address, contact_number, level_of_archicad_skills, module, payment_amount }) => {
	const rows = await sql`
		UPDATE register
		SET
			full_name = COALESCE(${full_name}, full_name),
			email_address = COALESCE(${email_address}, email_address),
			contact_number = COALESCE(${contact_number}, contact_number),
			level_of_archicad_skills = COALESCE(${level_of_archicad_skills}, level_of_archicad_skills),
			module = COALESCE(${module}, module),
			payment_amount = COALESCE(${payment_amount}, payment_amount)
		WHERE id = ${id}
		RETURNING *
	`;
	return rows[0] || null;
};

export const deleteRegistration = async (id) => {
	const rows = await sql`DELETE FROM register WHERE id = ${id} RETURNING *`;
	return rows[0] || null;
};


