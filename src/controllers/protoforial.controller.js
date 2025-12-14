import fs from 'fs';
import path from 'path';
import * as Proto from '../models/protoforial.model.js';
import { sendPaymentInstructionsEmail, sendTemporaryPasswordEmail } from '../services/mailService.js';

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

// Public: list all protoforials (excluding password hash) with payment status
export async function getPublicProtoforial(req, res) {
    try {
        const all = await Proto.getAllProtoforial();
        const sanitized = (all || []).map((row) => ({
            ...row,
            // simple helper flag so frontend can filter "With Doc" / "No Doc"
            has_documents: Boolean(row.support_document)
        }));
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

        // Category (optional, used for validation): 'media' | 'document' | 'project'
        const category = typeof req.body.category === 'string' ? String(req.body.category).toLowerCase() : null;
        if (category && !['media', 'document', 'project'].includes(category)) {
            return res.status(400).json({ success:false, message:'Invalid category. Allowed: media, document, project' });
        }

        // Accept description(s) via body:
        // - description: single string, applied to all files
        // - descriptions: array (or JSON string) with one description per uploaded file
        let descriptions = [];
        if (typeof req.body.descriptions !== 'undefined') {
            try {
                if (Array.isArray(req.body.descriptions)) {
                    descriptions = req.body.descriptions;
                } else if (typeof req.body.descriptions === 'string') {
                    // Try JSON parse first, otherwise treat as comma-separated
                    try {
                        const parsed = JSON.parse(req.body.descriptions);
                        descriptions = Array.isArray(parsed) ? parsed : [String(parsed)];
                    } catch {
                        descriptions = req.body.descriptions.split(',').map(s => s.trim());
                    }
                }
            } catch {
                // fallback to empty
                descriptions = [];
            }
        } else if (typeof req.body.description === 'string') {
            descriptions = [req.body.description];
        }

        // Description is optional - if not provided, use empty strings
        if (descriptions.length === 0 && files.length > 0) {
            // No descriptions provided - use empty strings for all files
            descriptions = Array(files.length).fill('');
        } else if (descriptions.length === 1 && files.length > 1) {
            // Apply the single description to all files (can be empty)
            descriptions = Array(files.length).fill(descriptions[0] || '');
        } else if (descriptions.length !== files.length) {
            // Mismatch - pad with empty strings or trim to match
            while (descriptions.length < files.length) {
                descriptions.push('');
            }
            descriptions = descriptions.slice(0, files.length);
        }
        // Normalize descriptions (trim, allow empty)
        descriptions = descriptions.map(d => String(d || '').trim());

        // Category-based validation
        const isImage = (m)=> /^image\//i.test(m || '');
        const isVideo = (m)=> /^video\//i.test(m || '');
        const isPdf = (m, name)=> /^application\/pdf$/i.test(m || '') || (name||'').toLowerCase().endsWith('.pdf');
        if (category === 'media') {
            const bad = files.filter(f => !(isImage(f.mimetype) || isVideo(f.mimetype)));
            if (bad.length) return res.status(400).json({ success:false, message:'Media uploads must be images or videos only.' });
        } else if (category === 'project') {
            const bad = files.filter(f => !isPdf(f.mimetype, f.originalname));
            if (bad.length) return res.status(400).json({ success:false, message:'Project uploads must be PDF files only.' });
        }

        const results = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const desc = String(descriptions[i]).trim();
            const saved = await Proto.addDocument(proto_id, { filename: f.originalname, mime_type: f.mimetype, buffer: f.buffer, description: desc, category: category || null });
            results.push(saved);
        }
        const docs = await Proto.getDocuments(proto_id);
        res.json({ success:true, data: { uploaded: results, documents: docs } });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function deleteDocument(req, res) {
    try {
        const { document_id } = req.params;
        await Proto.deleteDocument(document_id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function uploadProfileImage(req, res) {
    try {
        const { proto_id } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }
        await Proto.updateProfileImage(proto_id, req.file.buffer);
        res.json({ success: true, message: 'Profile image updated successfully' });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function getProfileImage(req, res) {
    try {
        const { proto_id } = req.params;
        const row = await Proto.getProfileImage(proto_id);
        if (!row || !row.profile_image) {
            return res.status(404).json({ success:false, message: 'Profile image not found' });
        }
        res.setHeader('Content-Type', 'image/jpeg');
        return res.end(row.profile_image);
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function getAllProtoforial(req, res) {
    try {
        const protoforials = await Proto.getAllProtoforial();
        res.json({ success: true, data: protoforials || [] });
    } catch (error) {
        console.error('Error in getAllProtoforial controller:', error);
        // Handle connection pool errors gracefully
        if (error.code === 'XX000' || error.message?.includes('MaxClientsInSessionMode') || error.code === 'CONNECT_TIMEOUT') {
            return res.status(503).json({ 
                success: false,
                message: 'Service temporarily unavailable. Please try again in a moment.',
                error: 'Database connection pool exhausted'
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching protoforials',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
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
    const mime = doc.mime_type || 'application/octet-stream';
    const filename = doc.filename || `document-${document_id}`;
    const buffer = doc.data;
    const total = buffer?.length || 0;

    // Override global no-store for media/documents to enable browser caching
    const lastModified = doc.created_at ? new Date(doc.created_at) : new Date();
    const etag = `W/"proto-doc-${document_id}-${total}-${lastModified.getTime()}"`;
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', lastModified.toUTCString());

    // Handle conditional requests
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const sinceTime = new Date(ifModifiedSince).getTime();
      if (!Number.isNaN(sinceTime) && lastModified.getTime() <= sinceTime) {
        return res.status(304).end();
      }
    }

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');

    // Support HTTP Range for faster start on videos/pdfs
    const range = req.headers.range;
    const isRangedType = /^video\/|^audio\/|^application\/pdf$/i.test(mime);
    if (range && total > 0 && isRangedType) {
      const match = range.match(/bytes=(\d+)-(\d+)?/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, total - 1); // up to 1MB chunk
        if (!Number.isNaN(start) && start < total) {
          const chunkEnd = Math.min(end, total - 1);
          const chunkSize = (chunkEnd - start) + 1;
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${chunkEnd}/${total}`);
          res.setHeader('Content-Length', String(chunkSize));
          return res.end(buffer.subarray(start, chunkEnd + 1));
        }
      }
    }

    // Full content
    if (total > 0) {
      res.setHeader('Content-Length', String(total));
    }
    return res.end(buffer);
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function changePassword(req, res) {
    try {
        const { email, currentPassword, newPassword } = req.body;
        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, current password, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }
        await Proto.changeProtoforialPassword(email, currentPassword, newPassword);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-10);

        // Fetch name for nicer email
        let name = '';
        try {
          const acc = await Proto.getProtoforialByEmail(email);
          name = acc?.full_name || '';
        } catch { /* ignore */ }

        // Try sending email first; if sending fails, do NOT change password to avoid locking the user out
        try {
          await sendTemporaryPasswordEmail({ email, name, tempPassword });
        } catch (mailErr) {
          console.error('Failed to send temporary password email:', mailErr.message);
          return res.status(500).json({ success: false, message: 'Email delivery failed. Please contact support or try again later.' });
        }

        // Email sent successfully; now set the temporary password
        await Proto.resetProtoforialPassword(email, tempPassword);
        return res.json({ success: true, message: 'Temporary password sent to your email address' });
    } catch (error) {
        res.status(400).json({ success:false, message: error.message });
    }
}

