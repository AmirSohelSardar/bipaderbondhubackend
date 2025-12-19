import Comment from '../models/comment.model.js';
import { errorHandler } from '../utils/error.js';

/**
 * CREATE COMMENT
 */
export const createComment = async (req, res, next) => {
  try {
    const { content, postId, userId } = req.body;

    if (userId !== req.user.id) {
      return next(errorHandler(403, 'You are not allowed to create this comment'));
    }

    // Validate content
    if (!content || content.trim() === '') {
      return next(errorHandler(400, 'Comment content is required'));
    }

    if (content.length > 200) {
      return next(errorHandler(400, 'Comment must be less than 200 characters'));
    }

    // Validate postId
    if (!postId) {
      return next(errorHandler(400, 'Post ID is required'));
    }

    const newComment = new Comment({
      content: content.trim(),
      postId,
      userId,
    });

    await newComment.save();
    res.status(200).json(newComment);
  } catch (error) {
    next(error);
  }
};

/**
 * GET COMMENTS OF A POST
 */
export const getPostComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).sort({
      createdAt: -1,
    });

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

/**
 * LIKE / UNLIKE COMMENT
 */
export const likeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return next(errorHandler(404, 'Comment not found'));
    }

    const userIndex = comment.likes.indexOf(req.user.id);

    if (userIndex === -1) {
      // Like the comment
      comment.likes.push(req.user.id);
      comment.numberOfLikes += 1;
    } else {
      // Unlike the comment
      comment.likes.splice(userIndex, 1);
      comment.numberOfLikes -= 1;
    }

    await comment.save();
    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
};

/**
 * EDIT COMMENT
 */
export const editComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return next(errorHandler(404, 'Comment not found'));
    }

    // Check authorization
    if (comment.userId !== req.user.id && !req.user.isAdmin) {
      return next(errorHandler(403, 'You are not allowed to edit this comment'));
    }

    // Validate new content
    if (!req.body.content || req.body.content.trim() === '') {
      return next(errorHandler(400, 'Comment content is required'));
    }

    if (req.body.content.length > 200) {
      return next(errorHandler(400, 'Comment must be less than 200 characters'));
    }

    comment.content = req.body.content.trim();
    await comment.save();

    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE COMMENT
 */
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return next(errorHandler(404, 'Comment not found'));
    }

    // Check authorization
    if (comment.userId !== req.user.id && !req.user.isAdmin) {
      return next(errorHandler(403, 'You are not allowed to delete this comment'));
    }

    await comment.deleteOne();
    res.status(200).json('Comment has been deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: GET ALL COMMENTS (with pagination)
 * ✅ FIXED: Renamed from 'getcomments' to 'getComments' for consistency
 */
export const getComments = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(403, 'You are not allowed to view all comments'));
  }

  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === 'asc' ? 1 : -1;

    const comments = await Comment.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalComments = await Comment.countDocuments();

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const lastMonthComments = await Comment.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      comments,
      totalComments,
      lastMonthComments,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Export both names for backward compatibility
export const getcomments = getComments;