import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import Post from '../models/post.model.js';
import Comment from '../models/comment.model.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

export const test = (req, res) => {
  res.json({ message: 'API is working!' });
};

/**
 * ✅ UPDATE USER
 */
export const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to update this user'));
  }

  try {
    const currentUser = await User.findById(req.params.userId);
    if (!currentUser) {
      return next(errorHandler(404, 'User not found'));
    }

    const updates = {};

    // 🔒 Block password update for Google users
    if (req.body.password) {
      if (currentUser.authProvider === 'google') {
        return next(
          errorHandler(400, 'Cannot update password for Google accounts')
        );
      }
      if (req.body.password.length < 6) {
        return next(
          errorHandler(400, 'Password must be at least 6 characters')
        );
      }
      updates.password = bcryptjs.hashSync(req.body.password, 10);
    }

    if (req.body.username) {
      if (req.body.username.length < 7 || req.body.username.length > 20) {
        return next(
          errorHandler(400, 'Username must be between 7 and 20 characters')
        );
      }
      if (req.body.username.includes(' ')) {
        return next(errorHandler(400, 'Username cannot contain spaces'));
      }
      if (req.body.username !== req.body.username.toLowerCase()) {
        return next(errorHandler(400, 'Username must be lowercase'));
      }
      if (!req.body.username.match(/^[a-z0-9]+$/)) {
        return next(
          errorHandler(
            400,
            'Username can only contain lowercase letters and numbers'
          )
        );
      }
      updates.username = req.body.username;
    }

    if (req.body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return next(errorHandler(400, 'Please provide a valid email'));
      }
      updates.email = req.body.email.toLowerCase().trim();
    }

    // ✅ FIXED: Handle profile picture update with proper cleanup
    if (req.body.profilePicture) {
      // If updating to a new Cloudinary image, delete the old one (but not Google photos or default)
      if (
        currentUser.profilePicture &&
        currentUser.profilePicture.includes('cloudinary.com') &&
        req.body.profilePicture !== currentUser.profilePicture
      ) {
        // Delete old Cloudinary image
        await deleteFromCloudinary(currentUser.profilePicture);
      }

      updates.profilePicture = req.body.profilePicture;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    const { password, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    // Handle duplicate username/email error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(errorHandler(400, `This ${field} is already taken`));
    }
    next(error);
  }
};

/**
 * ✅ DELETE USER - WITH CASCADING DELETES
 * 🔴 CRITICAL FIX: Now deletes user's posts and comments
 */
export const deleteUser = async (req, res, next) => {
  if (!req.user.isAdmin && req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to delete this user'));
  }

  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    // ✅ FIXED: Cascading delete - Delete all user's posts and comments
    console.log(`🗑️ Deleting user ${user.username} and all their content...`);

    // 1. Get all user's posts to delete their images
    const userPosts = await Post.find({ userId: req.params.userId });

    // 2. Delete all images from user's posts
    for (const post of userPosts) {
      if (post.image && post.image.includes('cloudinary.com')) {
        await deleteFromCloudinary(post.image);
      }
    }

    // 3. Delete all user's posts
    const deletedPosts = await Post.deleteMany({ userId: req.params.userId });
    console.log(`   ✅ Deleted ${deletedPosts.deletedCount} posts`);

    // 4. Delete all user's comments
    const deletedComments = await Comment.deleteMany({ userId: req.params.userId });
    console.log(`   ✅ Deleted ${deletedComments.deletedCount} comments`);

    // 5. Delete profile picture from Cloudinary (if not Google image or default)
    if (
      user.profilePicture &&
      !user.profilePicture.includes('googleusercontent.com') &&
      !user.profilePicture.includes('pixabay.com') &&
      user.profilePicture.includes('cloudinary.com')
    ) {
      await deleteFromCloudinary(user.profilePicture);
      console.log(`   ✅ Deleted profile picture`);
    }

    // 6. Finally, delete the user
    await User.findByIdAndDelete(req.params.userId);
    console.log(`   ✅ Deleted user account`);

    res.status(200).json({
      message: 'User has been deleted',
      deletedPosts: deletedPosts.deletedCount,
      deletedComments: deletedComments.deletedCount,
    });
  } catch (error) {
    console.error('Error during user deletion:', error);
    next(error);
  }
};

/**
 * ✅ SIGN OUT
 */
export const signout = (req, res, next) => {
  try {
    res
      .clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      })
      .status(200)
      .json('User has been signed out');
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ GET ALL USERS (Admin)
 */
export const getUsers = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(403, 'You are not allowed to see all users'));
  }

  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === 'asc' ? 1 : -1;

    const users = await User.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit)
      .select('-password'); // Don't include password field

    const totalUsers = await User.countDocuments();

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      users,
      totalUsers,
      lastMonthUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ GET SINGLE USER
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};