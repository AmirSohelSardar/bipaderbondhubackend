import express from 'express';
import multer from 'multer';
import { verifyToken } from '../utils/verifyUser.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// multer (memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Only image files allowed'));
  },
});

/**
 * ✅ BLOG IMAGE UPLOAD (ADMIN)
 * URL: POST /api/upload/blog-image
 */
router.post(
  '/blog-image',
  verifyToken,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin only' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        'blog-images'
      );

      res.status(200).json({
        imageUrl: result.secure_url,
      });
    } catch (error) {
      console.error('Blog image upload error:', error);
      res.status(500).json({ message: 'Image upload failed' });
    }
  }
);

export default router;
