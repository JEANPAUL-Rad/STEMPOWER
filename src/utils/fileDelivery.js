import fs from 'fs';
import path from 'path';
import cloudinary from './cloudinary.js';
import https from 'https';
import http from 'http';

export const isRemoteUrl = (url = '') => /^https?:\/\//i.test(url);
const isCloudinaryUrl = (url = '') => /^https?:\/\/res\.cloudinary\.com\//i.test(url);
const extFromContentType = (contentType = '') => {
  const t = String(contentType || '').toLowerCase().split(';')[0].trim();
  const map = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'application/zip': '.zip',
  };
  return map[t] || '';
};

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
  // Support singular/plural resource type paths and optional version
  const cloudinaryRegex = /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/(image|images|video|videos|raw|auto)\/upload\/(.+)$/i;
  const match = url.match(cloudinaryRegex);
  if (!match) return null;

  const [, , resourceTypeRaw, suffix] = match;
  const resourceType = resourceTypeRaw.replace(/s$/, ''); // normalize images->image, videos->video
  const [pathWithVersion] = suffix.split(/[?#]/);
  const withoutVersion = pathWithVersion.replace(/^v\d+\//, '');
  const lastDot = withoutVersion.lastIndexOf('.');

  const publicId = lastDot !== -1 ? withoutVersion.slice(0, lastDot) : withoutVersion;
  const format = lastDot !== -1 ? withoutVersion.slice(lastDot + 1) : undefined;

  return { resourceType, publicId, format };
};

// Insert fl_attachment right after /upload/
// NOTE: Do NOT pass a filename in the transformation.
// Cloudinary can reject fl_attachment:<filename> (400) depending on asset settings / encoding.
// We set Content-Disposition ourselves when proxying through this server.
const addAttachmentTransformation = (url = '') => {
  if (!isCloudinaryUrl(url)) return null;
  // Preserve any existing transformations by inserting fl_attachment first
  // e.g., .../upload/ -> .../upload/fl_attachment[:filename]/
  const attachSegment = `fl_attachment`;
  return url.replace(/\/upload\/(?!fl_attachment)/, `/upload/${attachSegment}/`);
};

export const generateCloudinaryCandidateUrls = (fileUrl, downloadName) => {
  const meta = extractCloudinaryPublicId(fileUrl);
  if (!meta) return [];

  const primaryResourceType = meta.resourceType || 'raw';
  const candidateTypes = Array.from(new Set([primaryResourceType, 'raw', 'image', 'video', 'auto']));
  const publicIdWithFormat = meta.format ? `${meta.publicId}.${meta.format}` : meta.publicId;
  const candidates = [];
  const authTokenKey = process.env.CLOUDINARY_AUTH_TOKEN_KEY || process.env.CLD_AUTH_TOKEN_KEY;
  const commonAuthToken = authTokenKey
    ? { auth_token: { key: authTokenKey, duration: 300 } }
    : {};

  for (const resourceType of candidateTypes) {
    try {
      // 1) Authenticated delivery (signed URL)
      const authUrl = cloudinary.url(publicIdWithFormat, {
        resource_type: resourceType,
        type: 'authenticated',
        sign_url: true,
        secure: true,
        ...commonAuthToken,
      });
      if (authUrl) candidates.push(authUrl);
    } catch (err) {
      console.error(`Cloudinary authenticated URL generation failed (${resourceType}):`, err.message);
    }

    try {
      // 2) Private asset download URL
      const privateUrl = cloudinary.utils.private_download_url(meta.publicId, meta.format, {
        resource_type: resourceType,
        attachment: downloadName || undefined,
      });
      if (privateUrl) candidates.push(privateUrl);
    } catch (err) {
      console.error(`Cloudinary private download URL generation failed (${resourceType}):`, err.message);
    }

    try {
      // 3) Signed upload delivery (in case asset is public/upload but requires signing/passthrough)
      const signedUploadUrl = cloudinary.url(publicIdWithFormat, {
        resource_type: resourceType,
        type: 'upload',
        sign_url: true,
        secure: true,
        ...commonAuthToken,
      });
      if (signedUploadUrl) candidates.push(signedUploadUrl);
    } catch (err) {
      console.error(`Cloudinary signed upload URL generation failed (${resourceType}):`, err.message);
    }
  }

  return candidates;
};

// Backwards-compat shim (used by getResolvedFileUrl)
export const generateCloudinaryDownloadUrl = (fileUrl, downloadName) => {
  const list = generateCloudinaryCandidateUrls(fileUrl, downloadName);
  return list[0] || null;
};

export const getResolvedFileUrl = (fileUrl, fileName) => {
  if (!fileUrl) return null;
  if (!isRemoteUrl(fileUrl)) return fileUrl;
  return generateCloudinaryDownloadUrl(fileUrl, fileName) || fileUrl;
};

// This is the main function that handles streaming remote files with proper headers and redirects
const streamRemote = async (res, url, downloadName, maxRedirects = 3, options = {}) => {
  return new Promise((resolve, reject) => {
    const doRequest = (currentUrl, redirectsLeft) => {
      const protocol = currentUrl.startsWith('https') ? https : http;
      
      protocol.get(currentUrl, (response) => {
        // Handle redirects
        if ([301, 302, 307, 308].includes(response.statusCode) && redirectsLeft > 0) {
          const location = response.headers.location;
          if (!location) {
            return reject(new Error('Redirect with no Location header'));
          }
          return doRequest(location, redirectsLeft - 1);
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          const err = new Error(`Request failed with status ${response.statusCode}`);
          err.statusCode = response.statusCode;
          return reject(err);
        }

        // Set content type if provided in options
        if (options.contentType) {
          res.setHeader('Content-Type', options.contentType);
        } else if (response.headers['content-type']) {
          // Use the content type from the response if not provided in options
          res.setHeader('Content-Type', response.headers['content-type']);
        }

        // Set content disposition for download with proper filename encoding
        if (downloadName) {
          // If forceInline is true, set inline disposition for browser display (e.g., PDFs)
          if (options.forceInline) {
            res.setHeader('Content-Disposition', 'inline');
          } else if (!options.forceAttachment) {
            // Default to inline if not explicitly forced to attachment
            res.setHeader('Content-Disposition', 'inline');
          } else {
            // If the provided name has no extension, infer one from response content-type.
            const inferredExt = extFromContentType(response.headers['content-type']);
            const hasExt = path.extname(String(downloadName)) !== '';
            const resolvedName = !hasExt && inferredExt ? `${downloadName}${inferredExt}` : downloadName;

            // "filename=" should be ASCII-safe to avoid header parsing issues in browsers.
            const asciiName = String(resolvedName)
              .replace(/[/\\]/g, '_')
              .replace(/["\r\n]/g, '')
              .trim() || 'download';

            const safeFilenameStar = encodeURIComponent(asciiName)
              .replace(/['()]/g, escape)
              .replace(/\*/g, '%2A')
              .replace(/"/g, '%22')
              .replace(/\//g, '%2F')
              .replace(/:/g, '%3A');
            
            res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${safeFilenameStar}`);
          }
        }

        // Stream the response to the client
        response.pipe(res);
        response.on('end', resolve);
      }).on('error', reject);
    };
    
    // Start the request
    doRequest(url, maxRedirects);
  });
};

export const streamOrRedirect = async (res, fileUrl, downloadName, notFoundMessage = 'File not found on server.', options = {}) => {
  if (!fileUrl) {
    return res.status(404).json({ message: notFoundMessage });
  }

  if (isRemoteUrl(fileUrl)) {
    const candidates = [];
    // If Cloudinary URL, try an fl_attachment URL first (works for public assets)
    if (isCloudinaryUrl(fileUrl)) {
      const attachUrl = addAttachmentTransformation(fileUrl);
      if (attachUrl) candidates.push(attachUrl);
    }
    candidates.push(...generateCloudinaryCandidateUrls(fileUrl, downloadName), fileUrl);
    for (let i = 0; i < candidates.length; i++) {
      try {
        await streamRemote(res, candidates[i], downloadName, 3, options);
        return;
      } catch (err) {
        console.error(`Remote stream failed for candidate ${i + 1}:`, err.message);
      }
    }
    // Final fallback: redirect to the original URL
    return res.redirect(fileUrl);
  }

  const filePath = resolveLocalDownloadPath(fileUrl);
  if (!filePath) {
    return res.status(404).json({ message: notFoundMessage });
  }

  // Handle inline disposition for local files
  if (options.forceInline || !options.forceAttachment) {
    const fileName = downloadName || path.basename(filePath);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        if (err.code === 'ENOENT') {
          res.status(404).json({ message: notFoundMessage });
        } else {
          res.status(500).json({ message: 'Error downloading file.' });
        }
      }
    });
  } else {
    return res.download(filePath, downloadName || path.basename(filePath), (err) => {
      if (err && !res.headersSent) {
        if (err.code === 'ENOENT') {
          res.status(404).json({ message: notFoundMessage });
        } else {
          res.status(500).json({ message: 'Error downloading file.' });
        }
      }
    });
  }
};






