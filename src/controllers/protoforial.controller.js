import * as Proto from '../models/protoforial.model.js';
import { sendPaymentInstructionsEmail } from '../services/mailService.js';
import fs from 'fs';
import path from 'path';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function register(req, res) {
    try {
        const { full_name, email, phone, password, course, experience_years, support_document } = req.body;
        // Basic validation
        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ success:false, message:'Full name is required (min 2 characters)' });
        }
        if (!password || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/.test(password)) {
            return res.status(400).json({ success:false, message:'Password must be at least 8 characters and include letters and numbers' });
        }
        const created = await Proto.createProtoforial({ full_name, email, phone, password, course, experience_years, support_document });

        // Determine payment amount based on course (defaults to 60000 RWF)
        const COURSE_AMOUNTS = {
            'MEP Design': 60000,
            'Electrical Design': 60000,
            'Plumbing & Mechanical Design (HVAC)': 60000
        };
        const amount = COURSE_AMOUNTS[course] || 60000;

        // Send payment instruction email (uses Brevo config via sendMail)
        try {
            await sendPaymentInstructionsEmail({
                email,
                name: full_name,
                amount,
                reference: email,
                payToName: 'NKUSI ENGINEERING GROUP LTD',
                payToNumber: '0795813936'
            });
        } catch (mailErr) {
            // Do not fail registration if email sending has issues
            console.error('Failed to send payment instructions email:', mailErr.message);
        }

        res.json({ success: true, data: created, message: `Registration successful. Payment amount: ${amount} RWF` });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        const account = await Proto.loginProtoforial({ email, password });
        res.json({ success: true, data: account });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
}

export async function me(req, res) {
    try {
        const { email } = req.query;
        const account = await Proto.getProtoforialByEmail(email);
        res.json({ success: true, data: account });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function update(req, res) {
    try {
        const { proto_id } = req.params;
        const updated = await Proto.updateProtoforial(proto_id, req.body);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function remove(req, res) {
    try {
        const { proto_id } = req.params;
        await Proto.deleteProtoforial(proto_id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function adminSetPaymentStatus(req, res) {
    try {
        const { proto_id } = req.params;
        const { payment_status } = req.body; // 'paid' | 'unpaid'
        const updated = await Proto.adminUpdatePaymentStatus(proto_id, payment_status);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

// Public: list all protoforials without payment status (and no password hash)
export async function getPublicProtoforial(req, res) {
    try {
        const all = await Proto.getAllProtoforial();
        const sanitized = (all || []).map(({ payment_status, ...rest }) => rest);
        res.json({ success: true, data: sanitized });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function registerWithFile(req, res) {
    try {
        const { full_name, email, phone, password, course, experience_years } = req.body;
        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ success:false, message:'Full name is required (min 2 characters)' });
        }
        if (!password || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/.test(password)) {
            return res.status(400).json({ success:false, message:'Password must be at least 8 characters and include letters and numbers' });
        }
        let support_document = null;
        if (req.file) {
            const uploadDir = path.join(process.cwd(), 'uploads', 'chamber');
            ensureDir(uploadDir);
            const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, req.file.buffer);
            support_document = `/uploads/chamber/${filename}`;
        }
        const created = await Proto.createProtoforial({ full_name, email, phone, password, course, experience_years: parseInt(experience_years||'0',10), support_document });
        res.json({ success: true, data: created, message: 'Registration successful' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function uploadSupportDocument(req, res) {
    try {
        const { proto_id } = req.params;
        const files = req.files || (req.file ? [req.file] : []);
        if (!files.length) return res.status(400).json({ success:false, message:'No file uploaded' });

        const results = [];
        for (const f of files) {
            const saved = await Proto.addDocument(proto_id, { filename: f.originalname, mime_type: f.mimetype, buffer: f.buffer });
            results.push(saved);
        }
        const docs = await Proto.getDocuments(proto_id);
        res.json({ success:true, data: { uploaded: results, documents: docs } });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function getAllProtoforial(req, res) {
    try {
        const protoforials = await Proto.getAllProtoforial();
        res.json({ success: true, data: protoforials });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function listDocuments(req, res) {
    try {
        const { proto_id } = req.params;
        const docs = await Proto.getDocuments(proto_id);
        res.json({ success: true, data: docs });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function downloadDocument(req, res) {
    try {
        const { document_id } = req.params;
        const doc = await Proto.getDocumentData(document_id);
        if (!doc) return res.status(404).json({ success:false, message:'Document not found' });
        res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
        return res.end(doc.data);
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}


