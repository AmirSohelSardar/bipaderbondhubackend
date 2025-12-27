import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 100000,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    image: {
      type: String,
      default:
        'https://res.cloudinary.com/dfi3ywweg/image/upload/v1234567890/defaults/post-placeholder.png',
    },
    category: {
      type: String,
      default: 'uncategorized',
      lowercase: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
  },
  { 
    timestamps: true,
  }
);

// ✅ PERFORMANCE: Add compound indexes for common queries
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ updatedAt: -1 });

// ✅ TEXT INDEX: Enable text search on title and content
postSchema.index({ title: 'text', content: 'text' });

// ✅ Virtual for comment count (optional, for future use)
postSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
  count: true,
});

// ✅ FIXED: Pre-save hook without next() parameter
postSchema.pre('save', function () {
  if (this.title) {
    this.title = this.title.trim();
  }
  if (this.category) {
    this.category = this.category.toLowerCase().trim();
  }
  // ✅ No next() needed for synchronous hooks in Mongoose 6+
});

// ✅ Add instance method to generate URL-friendly slug


// ✅ Static method: Find posts by category with pagination
postSchema.statics.findByCategory = function (category, page = 1, limit = 9) {
  const skip = (page - 1) * limit;
  return this.find({ category })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// ✅ Static method: Search posts
postSchema.statics.search = function (searchTerm, page = 1, limit = 9) {
  const skip = (page - 1) * limit;
  return this.find(
    { $text: { $search: searchTerm } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit);
};

const Post = mongoose.model('Post', postSchema);

export default Post;