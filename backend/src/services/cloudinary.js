const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Sanity check: reject the placeholder value "Root" that was briefly set in prod,
// plus anything obviously invalid (Cloudinary cloud names are lowercased alnum + dashes)
function isConfigured() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) return false;
  if (CLOUD_NAME === 'Root' || CLOUD_NAME === 'your_cloud_name' || CLOUD_NAME.length < 3) return false;
  return true;
}

if (isConfigured()) {
  cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
} else {
  console.warn('[cloudinary] NOT configured — photo uploads will return 503. ' +
               `cloud_name=${CLOUD_NAME || '(unset)'}, api_key=${API_KEY ? 'set' : '(unset)'}`);
}

class PhotoUploadUnavailableError extends Error {
  constructor() {
    super('Photo upload not configured on server');
    this.name = 'PhotoUploadUnavailableError';
    this.statusCode = 503;
  }
}

/**
 * Upload a local file path to Cloudinary, return the secure URL.
 * Throws PhotoUploadUnavailableError (503) when credentials are missing/invalid
 * so the route returns quickly instead of waiting 1.5s for Cloudinary to 401.
 */
async function uploadPhoto(filePath, folder = 'trego/jobs') {
  if (!isConfigured()) throw new PhotoUploadUnavailableError();
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'image',
    transformation: [
      { width: 1200, crop: 'limit' },
      { quality: 'auto:good' },
    ],
  });
  return result.secure_url;
}

module.exports = { uploadPhoto, isConfigured, PhotoUploadUnavailableError };
