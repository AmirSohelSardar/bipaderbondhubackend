import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

/**
 * =====================================================
 * 🔒 ENV VALIDATION
 * =====================================================
 */
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables');
  process.exit(1);
}

/**
 * =====================================================
 * ⚙️ MONGOOSE OPTIONS (FREE TIER SAFE)
 * =====================================================
 * ❌ minPoolSize REMOVED (breaks Atlas free tier)
 * ❌ process.exit REMOVED
 * ✅ Auto reconnect added
 */
const mongooseOptions = {
  maxPoolSize: 5, // ✅ SAFE for free tier
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  retryWrites: true,
  w: 'majority',
  family: 4,
  compressors: 'zlib',
};

/**
 * =====================================================
 * 🔁 CONNECTION STATE
 * =====================================================
 */
let isConnecting = false;

/**
 * =====================================================
 * 🔗 CONNECT TO MONGODB
 * =====================================================
 */
export const connectDB = async () => {
  // Prevent duplicate connections
  if (isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    isConnecting = true;
    console.log('🔄 Connecting to MongoDB...');

    const conn = await mongoose.connect(
      process.env.MONGO_URI,
      mongooseOptions
    );

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);
    console.log(`🔗 State: ${getConnectionState(conn.connection.readyState)}`);

    isConnecting = false;
    setupConnectionEvents();

    return conn;
  } catch (error) {
    isConnecting = false;
    console.error('❌ MongoDB Connection Error:', error.message);

    console.log('🔁 Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000); // ✅ AUTO RETRY (CRITICAL FIX)
  }
};

/**
 * =====================================================
 * 📡 CONNECTION EVENT HANDLERS
 * =====================================================
 */
const setupConnectionEvents = () => {
  // Connected
  mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connection established');
  });

  // Error
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });

  // Disconnected (Atlas sleep)
  mongoose.connection.on('disconnected', () => {
    console.warn('🔴 MongoDB disconnected (Atlas may be idle)');
    console.log('🔁 Attempting reconnection in 5 seconds...');
    setTimeout(connectDB, 5000);
  });

  // Reconnected
  mongoose.connection.on('reconnected', () => {
    console.log('🟡 MongoDB reconnected successfully');
  });

  // App shutdown
  process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
  });

  // Nodemon restart
  process.on('SIGUSR2', async () => {
    await disconnectDB();
    process.kill(process.pid, 'SIGUSR2');
  });
};

/**
 * =====================================================
 * 🔌 DISCONNECT DATABASE
 * =====================================================
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔴 MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB:', error.message);
  }
};

/**
 * =====================================================
 * 📊 CONNECTION STATE HELPERS
 * =====================================================
 */
const getConnectionState = (state) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  return states[state] || 'Unknown';
};

export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getConnectionStatus = () => {
  const conn = mongoose.connection;
  return {
    state: getConnectionState(conn.readyState),
    host: conn.host || 'N/A',
    name: conn.name || 'N/A',
    readyState: conn.readyState,
  };
};

/**
 * =====================================================
 * 🩺 DATABASE HEALTH CHECK
 * =====================================================
 */
export const testConnection = async () => {
  try {
    if (!isConnected()) {
      return {
        success: false,
        message: 'Database not connected',
        status: getConnectionStatus(),
      };
    }

    await mongoose.connection.db.admin().ping();

    const stats = await mongoose.connection.db.stats();

    return {
      success: true,
      message: 'Database connection healthy',
      status: getConnectionStatus(),
      stats: {
        collections: stats.collections,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
        avgObjSize: `${(stats.avgObjSize / 1024).toFixed(2)} KB`,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database health check failed',
      error: error.message,
      status: getConnectionStatus(),
    };
  }
};

/**
 * =====================================================
 * 🧹 DATABASE UTILITIES (UNCHANGED)
 * =====================================================
 */
export const clearDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clear database in production!');
  }

  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }

  console.log('🗑️ Database cleared');
};

export const dropDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot drop database in production!');
  }

  await mongoose.connection.dropDatabase();
  console.log('💣 Database dropped');
};

export const createIndexes = async () => {
  const models = mongoose.modelNames();
  for (let modelName of models) {
    await mongoose.model(modelName).createIndexes();
  }
  console.log('📇 Indexes created');
};

/**
 * =====================================================
 * 📦 EXPORT MONGOOSE INSTANCE
 * =====================================================
 */
export default mongoose;
