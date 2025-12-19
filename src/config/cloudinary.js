import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';

// Validate Cloudinary credentials
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Missing Cloudinary environment variables');
  console.error('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗');
  console.error('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓' : '✗');
  console.error('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓' : '✗');
  throw new Error('Missing Cloudinary environment variables');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS URLs
});

console.log('✅ Cloudinary configured successfully');

/**
 * ✅ UPDATED: Upload image buffer to Cloudinary (NOW SUPPORTS RAW FILES)
 * @param {Buffer} buffer - Image buffer from multer
 * @param {String} folder - Cloudinary folder name (e.g., 'posts', 'profile-pictures')
 * @param {String} publicId - Optional custom public_id
 * @param {String} resourceType - Resource type ('auto', 'image', 'raw', 'video')
 * @returns {Promise<Object>} - Upload result with secure_url
 */
export const uploadToCloudinary = (buffer, folder = 'blog', publicId = null, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
   const uploadOptions = {
  folder: folder,
  resource_type: resourceType,
  type: 'upload', // ✅ CRITICAL FIX - This makes files publicly accessible
  access_mode: "public", // ✅ Ensure public access

  // ✅ THIS IS THE CRITICAL FIX
  format: resourceType === 'raw' ? 'pdf' : undefined,

  allowed_formats: resourceType === 'raw'
    ? undefined
    : ['jpg', 'jpeg', 'png', 'gif', 'webp'],

  transformation: resourceType === 'raw'
    ? undefined
    : [{ quality: 'auto:good' }, { fetch_format: 'auto' }],

  max_bytes: 5 * 1024 * 1024,
};


    // Add custom public_id if provided
    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true; // Allow overwriting existing files
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ File uploaded to Cloudinary:', result.secure_url);
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * ✅ IMPROVED: Extract public_id from Cloudinary URL with better parsing
 * @param {String} imageUrl - Full Cloudinary image URL
 * @returns {String|null} - Public ID or null
 */
export const extractPublicId = (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return null;
    }

    // Handle different Cloudinary URL formats
    // Format 1: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/filename.jpg
    // Format 2: https://res.cloudinary.com/demo/image/upload/folder/filename.jpg
    // Format 3: https://res.cloudinary.com/demo/raw/upload/v1234567890/folder/filename.pdf

    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');

    if (uploadIndex === -1) {
      console.error('Invalid Cloudinary URL format - no "upload" segment:', imageUrl);
      return null;
    }

    // Get everything after 'upload/'
    let pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');

    // Remove version number if present (v1234567890)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

    // Remove file extension
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

    return publicId;
  } catch (error) {
    console.error('❌ Error extracting public_id:', error);
    return null;
  }
};

/**
 * ✅ IMPROVED: Delete image/file from Cloudinary by URL (supports raw files too)
 * @param {String} imageUrl - Full Cloudinary image URL
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log('⚠️ Not a Cloudinary URL, skipping deletion');
      return { result: 'skipped' };
    }

    // Extract public_id using improved function
    const publicId = extractPublicId(imageUrl);

    if (!publicId) {
      console.error('❌ Could not extract public_id from URL:', imageUrl);
      return { result: 'error', error: 'Invalid URL format' };
    }

    console.log('🗑️ Deleting from Cloudinary:', publicId);

    // Determine resource type from URL
    const isRawFile = imageUrl.includes('/raw/upload/');
    const resourceType = isRawFile ? 'raw' : 'image';

    // Attempt deletion with retry logic
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          invalidate: true
        });

        if (result.result === 'ok') {
          console.log('✅ File deleted from Cloudinary');
          return result;
        } else if (result.result === 'not found') {
          console.log('⚠️ File not found on Cloudinary (may have been deleted already)');
          return result;
        } else {
          console.log('⚠️ File deletion result:', result.result);
          return result;
        }
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`⚠️ Deletion failed, retrying... (${retries} attempts left)`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error.message);
    // Don't throw error, just log it (so post/user deletion can continue)
    return { result: 'error', error: error.message };
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<String>} imageUrls - Array of Cloudinary image URLs
 * @returns {Promise<Array>} - Array of deletion results
 */
export const deleteMultipleFromCloudinary = async (imageUrls) => {
  try {
    const deletePromises = imageUrls.map((url) => deleteFromCloudinary(url));
    const results = await Promise.allSettled(deletePromises);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`✅ Deleted ${successful}/${imageUrls.length} images`);

    return results;
  } catch (error) {
    console.error('❌ Bulk deletion error:', error);
    return [];
  }
};

/**
 * Get Cloudinary image dimensions and info
 * @param {String} imageUrl - Cloudinary image URL
 * @returns {Promise<Object>} - Image details
 */
export const getImageInfo = async (imageUrl) => {
  try {
    const publicId = extractPublicId(imageUrl);

    if (!publicId) {
      throw new Error('Invalid Cloudinary URL');
    }

    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('❌ Error getting image info:', error);
    throw error;
  }
};

/**
 * Generate optimized image URL with transformations
 * @param {String} publicId - Cloudinary public_id
 * @param {Object} options - Transformation options
 * @returns {String} - Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = null,
    height = null,
    crop = 'fill',
    quality = 'auto:good',
    format = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    fetch_format: format,
    secure: true,
  });
};

/**
 * Upload image with progress tracking (for large files)
 * @param {Buffer} buffer - Image buffer
 * @param {String} folder - Cloudinary folder
 * @param {Function} onProgress - Progress callback (percentage)
 * @returns {Promise<Object>} - Upload result
 */
export const uploadWithProgress = (buffer, folder = 'blog', onProgress = null) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        type: 'upload', // ✅ Added for consistency
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // ✅ No SVG
        transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
        max_bytes: 5 * 1024 * 1024, // 5MB limit
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Track upload progress (Cloudinary doesn't provide built-in progress,
    // but we can simulate it based on buffer size)
    if (onProgress && typeof onProgress === 'function') {
      const totalSize = buffer.length;
      let uploaded = 0;

      const chunk = Math.ceil(totalSize / 10); // 10% chunks

      const progressInterval = setInterval(() => {
        uploaded += chunk;
        const percentage = Math.min((uploaded / totalSize) * 100, 100);
        onProgress(Math.floor(percentage));

        if (uploaded >= totalSize) {
          clearInterval(progressInterval);
        }
      }, 100);
    }

    uploadStream.end(buffer);
  });
};

/**
 * Check if URL is a Cloudinary URL
 * @param {String} url - Image URL to check
 * @returns {Boolean} - True if Cloudinary URL
 */
export const isCloudinaryUrl = (url) => {
  return url && url.includes('cloudinary.com');
};

export default cloudinary;