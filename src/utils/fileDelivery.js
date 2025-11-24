import fs from 'fs';
import path from 'path';
import cloudinary from './cloudinary.js';

export const isRemoteUrl = (url = '') => /^https?:\/\//i.test(url);

export const resolveLocalDownloadPath = (fileUrl = '') => {
  if (!fileUrl) return null;

  if (path.isAbsolute(fileUrl) && fs.existsSync(fileUrl)) {
    return fileUrl;
  }

  const cleaned = fileUrl.replace(/^[./\\]+/, '');
  const directPath = path.join(process.cwd(), cleaned);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const uploadsPath = path.join(process.cwd(), 'uploads', cleaned);
  if (fs.existsSync(uploadsPath)) {
    return uploadsPath;
  }

  return null;
};

const extractCloudinaryPublicId = (url = '') => {
  const cloudinaryRegex = /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/([^/]+)\/upload\/(.+)$/i;
  const match = url.match(cloudinaryRegex);
  if (!match) return null;

  const [, , resourceType, suffix] = match;
  const [pathWithVersion] = suffix.split(/[?#]/);
  const withoutVersion = pathWithVersion.replace(/^v\d+\//, '');
  const lastDot = withoutVersion.lastIndexOf('.');

  const publicId = lastDot !== -1 ? withoutVersion.slice(0, lastDot) : withoutVersion;
  const format = lastDot !== -1 ? withoutVersion.slice(lastDot + 1) : undefined;

  return { resourceType, publicId, format };
};

export const generateCloudinaryDownloadUrl = (fileUrl, downloadName) => {
  const meta = extractCloudinaryPublicId(fileUrl);
  if (!meta) return null;

  try {
    return cloudinary.utils.private_download_url(meta.publicId, meta.format, {
      resource_type: meta.resourceType || 'raw',
      attachment: downloadName || undefined,
    });
  } catch (err) {
    console.error('Cloudinary download URL generation failed:', err.message);
    return null;
  }
};

export const getResolvedFileUrl = (fileUrl, fileName) => {
  if (!fileUrl) return null;
  if (!isRemoteUrl(fileUrl)) return fileUrl;
  return generateCloudinaryDownloadUrl(fileUrl, fileName) || fileUrl;
};

export const streamOrRedirect = (res, fileUrl, downloadName, notFoundMessage = 'File not found on server.') => {
  if (!fileUrl) {
    return res.status(404).json({ message: notFoundMessage });
  }

  if (isRemoteUrl(fileUrl)) {
    const signed = generateCloudinaryDownloadUrl(fileUrl, downloadName);
    return res.redirect(signed || fileUrl);
  }

  const filePath = resolveLocalDownloadPath(fileUrl);
  if (!filePath) {
    return res.status(404).json({ message: notFoundMessage });
  }

  return res.download(filePath, downloadName || path.basename(filePath), (err) => {
    if (err && !res.headersSent) {
      if (err.code === 'ENOENT') {
        res.status(404).json({ message: notFoundMessage });
      } else {
        res.status(500).json({ message: 'Error downloading file.' });
      }
    }
  });
};




