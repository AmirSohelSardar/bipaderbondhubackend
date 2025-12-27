import slugify from 'slugify';

export const generateSlug = async (title, Post) => {
  const baseSlug = slugify(title, {
    lower: false,   // keep original language
    trim: true,
    strict: false, // allow Bangla + English + mixed
  });

  let slug = baseSlug;
  let i = 1;

  while (await Post.findOne({ slug })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }

  return slug;
};
