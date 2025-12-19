// ================== HIDE LOGS IN PRODUCTION ==================
// if (process.env.NODE_ENV === "production") {
//   const allowed = ["Server running", "Connected to MongoDB"];

//   const originalLog = console.log;
//   console.log = function (...args) {
//     const msg = args.join(" ");
//     if (allowed.some(a => msg.includes(a))) {
//       originalLog(...args);
//     }
//   };
// }
// // ==============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import userRoutes from './src/routes/user.route.js';
import authRoutes from './src/routes/auth.route.js';
import postRoutes from './src/routes/post.route.js';
import commentRoutes from './src/routes/comment.route.js';
import cookieParser from 'cookie-parser';
import uploadRoutes from './src/routes/upload.route.js';
import { connectDB, testConnection, isConnected } from './src/config/db.js';

// Configure environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

// ============================================================
// 🛡️ SECURITY MIDDLEWARE (Must be first)
// ============================================================

// Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts for React
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Stricter rate limiting for upload routes
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Only 20 uploads per hour
  message: 'Upload limit exceeded, please try again later.',
});

// MongoDB injection protection
app.use(mongoSanitize());

// ============================================================
// 🌐 CORS CONFIGURATION (Must be before other middleware)
// ============================================================

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } 
      else {
        console.log('❌ Blocked Origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // ✅ CRITICAL: Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'], // ✅ CRITICAL: Expose cookies
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// ✅ Handle preflight requests
app.options('*', cors());

// ============================================================
// 📦 BODY PARSING MIDDLEWARE
// ============================================================

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));

// URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// ============================================================
// 🧪 TEST & DEBUG ENDPOINTS
// ============================================================

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', async (req, res) => {
  const dbStatus = isConnected() ? 'connected' : 'disconnected';
  const healthCheck = await testConnection();
  
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: dbStatus,
    dbDetails: healthCheck,
  });
});

app.get('/api/debug', (req, res) => {
  // ⚠️ SECURITY: Disable in production or add authentication
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Debug endpoint disabled in production' });
  }

  res.json({
    message: 'Debug info',
    nodeEnv: process.env.NODE_ENV,
    hasMongoUri: !!process.env.MONGO_URI,
    hasCloudinaryName: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasCloudinaryKey: !!process.env.CLOUDINARY_API_KEY,
    hasCloudinarySecret: !!process.env.CLOUDINARY_API_SECRET,
    hasJwtSecret: !!process.env.JWT_SECRET,
    timestamp: new Date(),
  });
});

app.get('/api/debug-db', async (req, res) => {
  // ⚠️ SECURITY: Disable in production or add authentication
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Debug endpoint disabled in production' });
  }

  try {
    const healthCheck = await testConnection();
    res.json({
      message: healthCheck.success ? 'Database connection successful!' : 'Database connection failed',
      ...healthCheck,
      timestamp: new Date(),
    });
  } catch (error) {
    res.json({
      message: 'Database connection failed',
      success: false,
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// ✅ Test cookie endpoint
app.get('/api/test-cookie', (req, res) => {
  res.cookie('test_cookie', 'test_value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ 
    message: 'Cookie set successfully',
    cookies: req.cookies 
  });
});

// ============================================================
// 🛣️ API ROUTES
// ============================================================

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Apply stricter rate limiting to upload routes
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Regular routes
app.use('/api/user', userRoutes);
app.use('/api/post', postRoutes);
app.use('/api/comment', commentRoutes);

// ============================================================
// 🚫 404 HANDLER
// ============================================================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// ============================================================
// ⚠️ ERROR HANDLING MIDDLEWARE (Must be last)
// ============================================================

app.use((err, req, res, next) => {
  // Log error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error:', err);
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      statusCode: 403,
    });
  }

  // Rate limit error
  if (err.name === 'TooManyRequests') {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      statusCode: 429,
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB',
      statusCode: 400,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      statusCode: 401,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      statusCode: 401,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry. This data already exists.',
      statusCode: 400,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      statusCode: 400,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ============================================================
// 🚀 SERVER STARTUP
// ============================================================

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'MONGO_URI',
      'JWT_SECRET',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingEnvVars.forEach((varName) => {
        console.error(`   - ${varName}`);
      });
      process.exit(1);
    }

    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
      console.log(`🛡️ Security: Helmet, Rate Limiting, Mongo Sanitize enabled`);
      console.log(`📝 Rate Limits: Auth=5/15min, Upload=20/hr, General=100/15min`);

      // Test MongoDB connection
      if (isConnected()) {
        console.log('✅ MongoDB is ready to accept queries');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('🔴 HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('👋 SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('🔴 HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for Vercel
export default app;