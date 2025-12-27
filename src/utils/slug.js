import slugify from 'slugify';

export const generateSlug = async (title, Post) => {
  let baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  // 👉 Bangla title হলে fallback
  if (!baseSlug) {
    baseSlug = 'bangla-motivation';
  }

  let slug = baseSlug;
  let i = 1;

  while (await Post.findOne({ slug })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }

  return slug;
};
