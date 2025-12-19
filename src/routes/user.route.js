import express from 'express';
import multer from 'multer';
import {
  deleteUser,
  getUser,
  getUsers,
  signout,
  test,
  updateUser,
} from '../controllers/user.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import User from '../models/user.model.js';

const router = express.Router();

// Multer config
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
 * ✅ Upload profile picture (Cloudinary)
 */
router.post(
  '/upload/profile-picture',
  verifyToken,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Upload to Cloudinary (overwrite by user ID)
      const result = await uploadToCloudinary(
        req.file.buffer,
        'profile-pictures',
        req.user.id
      );

      user.profilePicture = result.secure_url;
      await user.save();

      res.status(200).json({
        url: result.secure_url,
        message: 'Profile picture updated successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  }
);

// Other routes
router.get('/test', test);
router.put('/update/:userId', verifyToken, updateUser);
router.delete('/delete/:userId', verifyToken, deleteUser);
router.post('/signout', signout);
router.get('/getusers', verifyToken, getUsers);
router.get('/:userId', getUser);

export default router;