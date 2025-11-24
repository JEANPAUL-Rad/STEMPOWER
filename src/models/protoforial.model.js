import sql from '../config/db.js';
import bcrypt from 'bcryptjs';

export async function createProtoforial({ full_name, email, phone, password, course, experience_years, support_document }) {
    const password_hash = await bcrypt.hash(password, 10);
    const rows = await sql`
        INSERT INTO protoforial (full_name, email, phone, password_hash, course, experience_years, support_document)
        VALUES (${full_name}, ${email}, ${phone}, ${password_hash}, ${course}, ${experience_years || 0}, ${support_document})
        RETURNING proto_id, full_name, email, phone, course, experience_years, support_document, payment_status, created_at, updated_at
    `;
    return rows[0];
}

export async function changeProtoforialPassword(email, currentPassword, newPassword) {
    const rows = await sql`SELECT proto_id, password_hash FROM protoforial WHERE email = ${email} LIMIT 1`;
    if (rows.length === 0) {
        throw new Error('Account not found');
    }
    const account = rows[0];
    const ok = await bcrypt.compare(currentPassword, account.password_hash);
    if (!ok) {
        throw new Error('Current password is incorrect');
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE protoforial SET password_hash = ${newHash}, updated_at = NOW() WHERE proto_id = ${account.proto_id}`;
    return { success: true };
}

export async function resetProtoforialPassword(email, newPassword) {
    const rows = await sql`SELECT proto_id FROM protoforial WHERE email = ${email} LIMIT 1`;
    if (rows.length === 0) {
        throw new Error('Account not found');
    }
    const account = rows[0];
    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE protoforial SET password_hash = ${newHash}, updated_at = NOW() WHERE proto_id = ${account.proto_id}`;
    return { success: true };
}

export async function loginProtoforial({ email, password }) {
    const rows = await sql`SELECT * FROM protoforial WHERE email = ${email} LIMIT 1`;
    if (rows.length === 0) throw new Error('Account not found');
    const account = rows[0];
    const ok = await bcrypt.compare(password, account.password_hash);
    if (!ok) throw new Error('Invalid credentials');
    // Do not return password hash
    delete account.password_hash;
    return account;
}

export async function getProtoforialByEmail(email) {
    const rows = await sql`SELECT proto_id, full_name, email, phone, course, experience_years, support_document, payment_status, created_at, updated_at FROM protoforial WHERE email = ${email} LIMIT 1`;
    return rows[0] || null;
}

export async function getProtoforialById(proto_id) {
    const rows = await sql`SELECT proto_id, full_name, email, phone, course, experience_years, support_document, payment_status, created_at, updated_at FROM protoforial WHERE proto_id = ${proto_id} LIMIT 1`;
    return rows[0] || null;
}

export async function updateProtoforial(proto_id, { full_name, phone, course, experience_years, support_document }) {
    const rows = await sql`
        UPDATE protoforial 
        SET 
            full_name = COALESCE(${full_name}, full_name),
            phone = COALESCE(${phone}, phone),
            course = COALESCE(${course}, course),
            experience_years = COALESCE(${experience_years}, experience_years),
            support_document = COALESCE(${support_document}, support_document),
            updated_at = NOW()
        WHERE proto_id = ${proto_id}
        RETURNING proto_id, full_name, email, phone, course, experience_years, support_document, payment_status, created_at, updated_at
    `;
    return rows[0];
}

export async function deleteProtoforial(proto_id) {
    await sql`DELETE FROM protoforial WHERE proto_id = ${proto_id}`;
    return { success: true };
}

export async function adminUpdatePaymentStatus(proto_id, payment_status) {
    const rows = await sql`
        UPDATE protoforial SET payment_status = ${payment_status}, updated_at = NOW()
        WHERE proto_id = ${proto_id}
        RETURNING proto_id, full_name, email, phone, course, experience_years, support_document, payment_status, created_at, updated_at
    `;
    return rows[0];
}

export async function getAllProtoforial() {
    const rows = await sql`
        SELECT proto_id, full_name, email, phone, course, experience_years, support_document, payment_status, created_at, updated_at 
        FROM protoforial 
        ORDER BY created_at DESC
    `;
    return rows;
}

export async function updateProfileImage(proto_id, buffer) {
    const rows = await sql`
        UPDATE protoforial
        SET profile_image = ${buffer}, updated_at = NOW()
        WHERE proto_id = ${proto_id}
        RETURNING proto_id
    `;
    return rows[0] || null;
}

export async function getProfileImage(proto_id) {
    const rows = await sql`
        SELECT profile_image FROM protoforial WHERE proto_id = ${proto_id} LIMIT 1
    `;
    return rows[0] || null;
}


// Documents (multiple, stored as BYTEA)
export async function addDocument(proto_id, { filename, mime_type, buffer }) {
    const rows = await sql`
        INSERT INTO protoforial_documents (proto_id, filename, mime_type, data)
        VALUES (${proto_id}, ${filename}, ${mime_type}, ${buffer})
        RETURNING document_id, filename, mime_type, created_at
    `;
    return rows[0];
}

export async function getDocuments(proto_id) {
    const rows = await sql`
        SELECT document_id, filename, mime_type, created_at
        FROM protoforial_documents
        WHERE proto_id = ${proto_id}
        ORDER BY created_at DESC
    `;
    return rows;
}

export async function getDocumentData(document_id) {
    const rows = await sql`
        SELECT document_id, filename, mime_type, data FROM protoforial_documents WHERE document_id = ${document_id}
    `;
    return rows[0] || null;
}

export async function deleteDocument(document_id) {
    await sql`DELETE FROM protoforial_documents WHERE document_id = ${document_id}`;
    return { success: true };
}


