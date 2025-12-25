import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';

// Cookie configuration for production
const getCookieOptions = () => {
  return {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'none',
    secure: true,
    path: '/',
  };
};

export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;

  // Validate input
  if (
    !username ||
    !email ||
    !password ||
    username === '' ||
    email === '' ||
    password === ''
  ) {
    return next(errorHandler(400, 'All fields are required'));
  }

  // Validate username
  if (username.length < 7 || username.length > 20) {
    return next(errorHandler(400, 'Username must be between 7 and 20 characters'));
  }

  if (username !== username.toLowerCase()) {
    return next(errorHandler(400, 'Username must be lowercase'));
  }

  if (!username.match(/^[a-z0-9]+$/)) {
    return next(errorHandler(400, 'Username can only contain lowercase letters and numbers'));
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(errorHandler(400, 'Please provide a valid email'));
  }

  // Sanitize email
  const sanitizedEmail = email.toLowerCase().trim();

  // Validate password
  if (password.length < 6) {
    return next(errorHandler(400, 'Password must be at least 6 characters'));
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);

  try {
    const newUser = new User({
      username,
      email: sanitizedEmail,
      password: hashedPassword,
      authProvider: 'local',
    });

    await newUser.save();
    res.json('Signup successful');
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(400, 'Username or email already exists'));
    }
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || email === '' || password === '') {
    return next(errorHandler(400, 'All fields are required'));
  }

  // Sanitize email
  const sanitizedEmail = email.toLowerCase().trim();

  try {
    const validUser = await User.findOne({ email: sanitizedEmail });

    if (!validUser) {
      return next(errorHandler(404, 'User not found'));
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      return next(errorHandler(400, 'Invalid password'));
    }

    const token = jwt.sign(
      { id: validUser._id, isAdmin: validUser.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: pass, ...rest } = validUser._doc;
    
    res
      .status(200)
      .cookie('access_token', token, getCookieOptions())
      .json(rest);
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  const { email, name, googlePhotoUrl } = req.body;

  // Validate input
  if (!email || !name) {
    return next(errorHandler(400, 'Email and name are required'));
  }

  // Sanitize email
  const sanitizedEmail = email.toLowerCase().trim();

  try {
    let user = await User.findOne({ email: sanitizedEmail });

    if (user) {
      // ✅ FIXED: Simplified profile picture logic
      // Only update to Google photo if user has NO custom Cloudinary photo
      const hasCloudinaryPhoto = user.profilePicture && 
                                  user.profilePicture.includes('cloudinary.com');

      // If user doesn't have a custom Cloudinary photo, update to Google photo
      if (!hasCloudinaryPhoto && googlePhotoUrl) {
        user.profilePicture = googlePhotoUrl;
      }
      // If they have a Cloudinary photo, keep it (don't overwrite with Google photo)

      // Update authProvider to track that they've used Google
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
      }
      
      await user.save();

      const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const { password, ...rest } = user._doc;

      return res
        .status(200)
        .cookie('access_token', token, getCookieOptions())
        .json(rest);
    } else {
      // Create new user with Google account
      // ✅ FIXED: Better username generation with more random digits
      const baseUsername = name.toLowerCase().split(' ').join('');
      const randomSuffix = Math.random().toString(36).slice(-8); // 8 characters instead of 4
      const username = baseUsername + randomSuffix;

      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);

      const newUser = new User({
        username,
        email: sanitizedEmail,
        password: hashedPassword,
        profilePicture: googlePhotoUrl || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
        authProvider: 'google',
      });

      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, isAdmin: newUser.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const { password, ...rest } = newUser._doc;

      return res
        .status(200)
        .cookie('access_token', token, getCookieOptions())
        .json(rest);
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    
    // Handle duplicate username error (rare but possible)
    if (error.code === 11000) {
      return next(errorHandler(400, 'Account creation failed. Please try again.'));
    }
    
    next(error);
  }
};