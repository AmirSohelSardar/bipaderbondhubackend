import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

// Validate MongoDB URI
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables');
  throw new Error('Missing MONGO_URI environment variable');
}

/**
 * MongoDB Connection Options
 * Optimized for production and development
 */
const mongooseOptions = {
  // Connection Management
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 5, // Minimum number of connections in the pool
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  
  // Automatic Reconnection
  retryWrites: true, // Retry failed writes
  w: 'majority', // Write concern
  
  // Compression
  compressors: 'zlib', // Compress data
  
  // Family 4 forces IPv4 (some hosting providers require this)
  family: 4,
};

/**
 * Connect to MongoDB Atlas
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Database Host: ${conn.connection.host}`);
    console.log(`📂 Database Name: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${getConnectionState(conn.connection.readyState)}`);
    
    // Handle connection events
    setupConnectionEvents();
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('🔍 Error Details:', error);
    
    // Exit process with failure
    process.exit(1);
  }
};

/**
 * Setup MongoDB connection event listeners
 */
const setupConnectionEvents = () => {
  // Connection successful
  mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connection established');
  });

  // Connection error
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  // Connection disconnected
  mongoose.connection.on('disconnected', () => {
    console.log('🔴 MongoDB disconnected');
  });

  // Reconnecting
  mongoose.connection.on('reconnected', () => {
    console.log('🟡 MongoDB reconnected');
  });

  // Application termination
  process.on('SIGINT', async () => {
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
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔴 MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
    throw error;
  }
};

/**
 * Get readable connection state
 * @param {Number} state - Mongoose connection state
 * @returns {String} - Human-readable state
 */
const getConnectionState = (state) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
    99: 'Uninitialized',
  };
  return states[state] || 'Unknown';
};

/**
 * Check if database is connected
 * @returns {Boolean} - True if connected
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get current connection status
 * @returns {Object} - Connection details
 */
export const getConnectionStatus = () => {
  const conn = mongoose.connection;
  return {
    state: getConnectionState(conn.readyState),
    host: conn.host || 'N/A',
    name: conn.name || 'N/A',
    port: conn.port || 'N/A',
    readyState: conn.readyState,
  };
};

/**
 * Test database connection and perform health check
 * @returns {Promise<Object>} - Health check result
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

    // Ping database
    await mongoose.connection.db.admin().ping();
    
    // Get database stats
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
    console.error('❌ Connection test failed:', error.message);
    return {
      success: false,
      message: 'Database connection test failed',
      error: error.message,
      status: getConnectionStatus(),
    };
  }
};

/**
 * Get database statistics
 * @returns {Promise<Object>} - Database statistics
 */
export const getDBStats = async () => {
  try {
    if (!isConnected()) {
      throw new Error('Database not connected');
    }

    const stats = await mongoose.connection.db.stats();
    
    return {
      database: mongoose.connection.name,
      collections: stats.collections,
      views: stats.views || 0,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      totalSize: stats.dataSize + stats.indexSize,
      scaleFactor: stats.scaleFactor,
    };
  } catch (error) {
    console.error('❌ Error getting DB stats:', error.message);
    throw error;
  }
};

/**
 * Clear all collections (USE WITH CAUTION - FOR TESTING ONLY)
 * @returns {Promise<void>}
 */
export const clearDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production!');
    }

    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`🗑️ Cleared collection: ${collection.collectionName}`);
    }
    
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  }
};

/**
 * Drop database (USE WITH EXTREME CAUTION - FOR TESTING ONLY)
 * @returns {Promise<void>}
 */
export const dropDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot drop database in production!');
    }

    await mongoose.connection.dropDatabase();
    console.log('✅ Database dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping database:', error.message);
    throw error;
  }
};

/**
 * Create indexes for all models
 * @returns {Promise<void>}
 */
export const createIndexes = async () => {
  try {
    const models = mongoose.modelNames();
    
    for (let modelName of models) {
      const model = mongoose.model(modelName);
      await model.createIndexes();
      console.log(`📇 Indexes created for: ${modelName}`);
    }
    
    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
};

// Export mongoose instance for direct access if needed
export default mongoose;