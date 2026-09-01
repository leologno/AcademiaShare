const cloudinary = require('cloudinary').v2;
const streamifier = require('stream');

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    secure: true,
  });
}

/**
 * Check if Cloudinary is configured with valid non-empty credentials
 */
const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const cloudinaryUrl = process.env.CLOUDINARY_URL || '';

  if (cloudinaryUrl && !cloudinaryUrl.includes('your_')) {
    return true;
  }

  return (
    Boolean(cloudName && apiKey && apiSecret) &&
    cloudName !== 'your_cloud_name' &&
    apiKey !== 'your_api_key' &&
    apiSecret !== 'your_api_secret'
  );
};

/**
 * Upload a file buffer to Cloudinary using stream
 * @param {Buffer} fileBuffer - The buffer of the file to upload
 * @param {Object} options - Custom Cloudinary upload options
 * @returns {Promise<Object>} Upload result { url, publicId, format, bytes }
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error('Cloudinary is not configured.'));
    }

    const defaultOptions = {
      folder: process.env.CLOUDINARY_FOLDER || 'studynotes',
      resource_type: 'auto', // Supports PDF, DOCX, Images, etc.
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by its public ID
 * @param {string} publicId - The Cloudinary public ID
 * @param {string} [resourceType='raw'] - Resource type ('image', 'raw', 'video', 'auto')
 */
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    // Try auto/image first, fallback to raw if needed
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (rawErr) {
      console.error('Error deleting file from Cloudinary:', rawErr);
    }
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
};
