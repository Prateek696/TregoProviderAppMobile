const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a local file path to Cloudinary, return the secure URL
async function uploadPhoto(filePath, folder = 'trego/jobs') {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'image',
    transformation: [
      { width: 1200, crop: 'limit' }, // cap size, no upscaling
      { quality: 'auto:good' },
    ],
  });
  return result.secure_url;
}

module.exports = { uploadPhoto };
