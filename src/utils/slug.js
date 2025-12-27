import slugify from 'slugify';

export const generateSlug = async (title, Post) => {
  let baseSlug = slugify(title, {
    lower: false,      // keep Bangla + English
    trim: true,
    strict: false,    // allow mixed language
  });

  // ✅ ABSOLUTE GUARANTEE: slug will NEVER be empty
  if (!baseSlug || baseSlug.length === 0) {
    baseSlug = title
      .trim()
      .replace(/\s+/g, '-')       // replace spaces with -
      .replace(/[\/\\?#%]/g, ''); // remove URL-breaking characters
  }

  // 🔐 LAST SAFETY NET (impossible to fail)
  if (!baseSlug || baseSlug.length === 0) {
    baseSlug = `post-${Date.now()}`;
  }

  let slug = baseSlug;
  let i = 1;

  // ✅ Ensure slug uniqueness
  while (await Post.findOne({ slug })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }

  return slug;
};
