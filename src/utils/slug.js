import slugify from 'slugify';

export const generateSlug = async (title, Post) => {
  // 1️⃣ Try slugify first
  let baseSlug = slugify(title, {
    lower: false,
    trim: true,
    strict: false,
  });

  // 2️⃣ If slugify fails (Bangla edge cases)
  if (!baseSlug || baseSlug.trim().length === 0) {
    baseSlug = title
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[\/\\?#%]/g, '');
  }

  // 3️⃣ Absolute last fallback (NEVER empty)
  if (!baseSlug || baseSlug.trim().length === 0) {
    baseSlug = `post-${Date.now()}`;
  }

  let slug = baseSlug;
  let i = 1;

  // 4️⃣ Ensure uniqueness
  while (await Post.findOne({ slug })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }

  return slug;
};
