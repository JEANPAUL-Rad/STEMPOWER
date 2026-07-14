import * as PublicationModel from '../../models/admin/publication.model.js';
import * as PublicationFileModel from '../../models/admin/publication_file.model.js';
import { savePublicationFile } from '../../utils/saveFile.js';

// POST /publications - Create new publication
export async function create(req, res) {
  try {
    const {
      title,
      publication_type,
      publication_date,
      expiry_date,
      status
    } = req.body;

    if (!title || !publication_type) {
      return res.status(400).json({ message: 'Title and type are required' });
    }

    const publication = await PublicationModel.createPublication({
      title,
      publication_type,
      publication_date: publication_date || new Date(),
      expiry_date: expiry_date || null,
      status: status || 'PUBLISHED',
      created_by: req.user?.user_id
    });

    // Handle multiple file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileUrl = await savePublicationFile(file);
        await PublicationFileModel.addPublicationFile({
          publication_id: publication.publication_id,
          file_url: fileUrl,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size_bytes: file.size,
          uploaded_by: req.user?.user_id
        });
      }
    }

    // Return publication with files
    const publicationWithFiles = await PublicationModel.getPublicationById(publication.publication_id);
    res.status(201).json(publicationWithFiles);
  } catch (err) {
    console.error('Create publication error:', err);
    res.status(500).json({ message: err.message });
  }
}

// GET /publications - List all publications
export async function list(req, res) {
  try {
    const publications = await PublicationModel.listPublications();
    res.json(publications);
  } catch (err) {
    console.error('List publications error:', err);
    res.status(500).json({ message: err.message });
  }
}

// GET /publications/published - Get published publications
export async function listPublished(req, res) {
  try {
    const publications = await PublicationModel.getPublishedPublications();
    res.json(publications);
  } catch (err) {
    console.error('List published publications error:', err);
    res.status(500).json({ message: err.message });
  }
}

// GET /publications/:publication_id - Get single publication
export async function get(req, res) {
  try {
    const publication = await PublicationModel.getPublicationById(req.params.publication_id);
    if (!publication) {
      return res.status(404).json({ message: "Publication not found" });
    }
    res.json(publication);
  } catch (err) {
    console.error('Get publication error:', err);
    res.status(500).json({ message: err.message });
  }
}

// PUT /publications/:publication_id - Update publication
export async function update(req, res) {
  try {
    const {
      title,
      publication_type,
      publication_date,
      expiry_date,
      status
    } = req.body;
    const publication_id = req.params.publication_id;

    const updatedPublication = await PublicationModel.updatePublication(publication_id, {
      title,
      publication_type,
      publication_date,
      expiry_date,
      status
    });

    if (!updatedPublication) {
      return res.status(404).json({ message: "Publication not found" });
    }

    // Handle multiple file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileUrl = await savePublicationFile(file);
        await PublicationFileModel.addPublicationFile({
          publication_id: publication_id,
          file_url: fileUrl,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size_bytes: file.size,
          uploaded_by: req.user?.user_id
        });
      }
    }

    // Return updated publication with files
    const publicationWithFiles = await PublicationModel.getPublicationById(publication_id);
    res.json(publicationWithFiles);
  } catch (err) {
    console.error('Update publication error:', err);
    res.status(500).json({ message: err.message });
  }
}

// DELETE /publications/:publication_id/files/:file_id - Delete a file
export async function deleteFile(req, res) {
  try {
    const { publication_id, file_id } = req.params;
    await PublicationFileModel.deleteFile(file_id);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ message: err.message });
  }
}

// DELETE /publications/:publication_id - Delete publication
export async function remove(req, res) {
  try {
    const publication_id = req.params.publication_id;
    await PublicationModel.deletePublication(publication_id);
    res.json({ message: "Publication deleted successfully" });
  } catch (err) {
    console.error('Delete publication error:', err);
    res.status(500).json({ message: err.message });
  }
}
