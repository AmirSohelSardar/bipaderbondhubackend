import Post from '../models/post.model.js';
import { errorHandler } from '../utils/error.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import Comment from '../models/comment.model.js';
import { generateSlug } from '../utils/slug.js';


/**
 * ✅ CREATE POST (Admin only)
 */
export const create = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(errorHandler(403, 'You are not allowed to create a post'));
    }

    const { title, content, image, category } = req.body;

    if (!title || !content) {
      return next(errorHandler(400, 'Please provide all required fields'));
    }

    // Validate content length
    if (content.length > 100000) {
      return next(errorHandler(400, 'Content is too long. Maximum 100,000 characters allowed'));
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      return next(errorHandler(400, 'Title must be between 3 and 200 characters'));
    }

  const slug = await generateSlug(title, Post);

const newPost = new Post({
  title,
  content,
  image: image || '',
  category: category || 'uncategorized',
  slug,
  userId: req.user.id,
});


    const savedPost = await newPost.save();

    res.status(201).json(savedPost);
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(400, 'Title or slug already exists'));
    }
    next(error);
  }
};

/**
 * ✅ GET POSTS (Search, Filter, Pagination)
 */
export const getposts = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const query = {};

    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.category) query.category = req.query.category;
    if (req.query.slug) query.slug = req.query.slug;
    if (req.query.postId) query._id = req.query.postId;

    if (req.query.searchTerm) {
      query.$or = [
        { title: { $regex: req.query.searchTerm, $options: 'i' } },
        { content: { $regex: req.query.searchTerm, $options: 'i' } },
      ];
    }

   const posts = await Post.find(query)
  .select('title image category slug createdAt') // 🚀 REMOVE content
  .sort({ updatedAt: sortOrder })
  .skip(startIndex)
  .limit(limit)
  .lean(); // 🚀 VERY IMPORTANT


    const totalPosts = await Post.countDocuments(query);

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const lastMonthPosts = await Post.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      posts,
      totalPosts,
      lastMonthPosts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ DELETE POST (Admin OR Owner)
 * 🔴 CRITICAL FIX: Changed || to && for proper authorization
 */
export const deletepost = async (req, res, next) => {
  try {
    // ✅ FIXED: Must be admin AND owner (not OR)
    // This now correctly allows: admin OR post owner to delete
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
      return next(errorHandler(403, 'You are not allowed to delete this post'));
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return next(errorHandler(404, 'Post not found'));
    }

    // Additional check: verify the post belongs to the userId in params
    if (post.userId.toString() !== req.params.userId && !req.user.isAdmin) {
      return next(errorHandler(403, 'You are not allowed to delete this post'));
    }

    // Delete all comments of this post
    await Comment.deleteMany({ postId: req.params.postId });

    // 🔥 Delete image from Cloudinary if exists
    if (post.image) {
      await deleteFromCloudinary(post.image);
    }

    await post.deleteOne();

    res.status(200).json('The post has been deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ UPDATE POST (Admin OR Owner)
 * 🔴 CRITICAL FIX: Changed || to && for proper authorization
 */
export const updatepost = async (req, res, next) => {
  try {
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
      return next(errorHandler(403, 'You are not allowed to update this post'));
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return next(errorHandler(404, 'Post not found'));
    }

    if (post.userId.toString() !== req.params.userId && !req.user.isAdmin) {
      return next(errorHandler(403, 'You are not allowed to update this post'));
    }

    if (req.body.content && req.body.content.length > 100000) {
      return next(errorHandler(400, 'Content is too long'));
    }

    if (
      req.body.title &&
      (req.body.title.length < 3 || req.body.title.length > 200)
    ) {
      return next(errorHandler(400, 'Invalid title length'));
    }

    // 🔥 Save old image
    const oldImage = post.image;

    // ✅ Update fields
    if (req.body.title) {
      post.title = req.body.title;
      post.slug = await generateSlug(req.body.title, Post);

    }

    if (req.body.content) post.content = req.body.content;
    if (req.body.category) post.category = req.body.category;
    if (req.body.image) post.image = req.body.image;

    // ✅ SAVE ONLY ONCE
    const updatedPost = await post.save();

    // ✅ Delete old image AFTER successful save
    if (req.body.image && oldImage && oldImage !== req.body.image) {
      await deleteFromCloudinary(oldImage);
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(400, 'Post title already exists'));
    }
    next(error);
  }
};

export const getHomePosts = async (req, res, next) => {
  try {
    const posts = await Post.find({})
      .select('title image category slug createdAt')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};


export const getPostBySlug = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).lean();
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};


