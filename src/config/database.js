const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not defined');
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.client = new MongoClient(mongoUri, options);
      await this.client.connect();
      
      // Extract database name from URI or use default
      const dbName = this.extractDatabaseName(mongoUri) || 'expense_manager';
      this.db = this.client.db(dbName);
      
      logger.info(`✅ MongoDB connected successfully to database: ${dbName}`);
      
      // Handle connection events
      this.client.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      this.client.on('close', () => {
        logger.warn('MongoDB connection closed');
      });

      this.client.on('reconnect', () => {
        logger.info('MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', this.closeConnection.bind(this));
      process.on('SIGTERM', this.closeConnection.bind(this));

      return this.db;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async closeConnection() {
    try {
      if (this.client) {
        await this.client.close();
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  getDb() {
    return this.db;
  }

  getClient() {
    return this.client;
  }

  isConnected() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  // Extract database name from MongoDB URI
  extractDatabaseName(uri) {
    try {
      const url = new URL(uri);
      const pathname = url.pathname;
      // Remove leading slash and get database name
      const dbName = pathname.substring(1);
      return dbName || null;
    } catch (error) {
      logger.warn('Could not extract database name from URI:', error.message);
      return null;
    }
  }

  // Helper method to get collection
  getCollection(collectionName) {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection(collectionName);
  }
}

module.exports = new Database();
