const { ObjectId } = require('mongodb');
const database = require('../config/database');
const logger = require('../utils/logger');

class Wallet {
  constructor() {
    this.collection = 'wallets';
  }

  // Get collection
  getCollection() {
    return database.getCollection(this.collection);
  }

  // Create indexes
  async createIndexes() {
    try {
      const collection = this.getCollection();
      await collection.createIndex({ userId: 1 });
      await collection.createIndex({ userId: 1, isDefault: 1 });
      await collection.createIndex({ userId: 1, name: 1 });
      await collection.createIndex({ currency: 1 });
      await collection.createIndex({ lastTransactionAt: -1 });
      logger.info('Wallet indexes created successfully');
    } catch (error) {
      logger.error('Error creating wallet indexes:', error);
    }
  }

  // Create new wallet
  async create(walletData) {
    try {
      const collection = this.getCollection();
      
      // If this is the first wallet, make it default
      const existingWallets = await collection.countDocuments({ userId: new ObjectId(String(walletData.userId)) });
      const isDefault = existingWallets === 0;
      
      const wallet = {
        userId: new ObjectId(String(walletData.userId)),
        name: walletData.name,
        balance: walletData.balance || 0,
        currency: walletData.currency || 'VND',
        description: walletData.description || '',
        color: walletData.color || '#3B82F6',
        icon: walletData.icon || 'wallet',
        isDefault,
        isActive: true,
        settings: {
          allowNegativeBalance: walletData.settings?.allowNegativeBalance || false,
          roundingMode: walletData.settings?.roundingMode || 'round',
          decimalPlaces: walletData.settings?.decimalPlaces || 2
        },
        lastTransactionAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(wallet);
      wallet._id = result.insertedId;
      
      return wallet;
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  // Find wallet by ID
  async findById(walletId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({ _id: new ObjectId(String(walletId)) });
    } catch (error) {
      logger.error('Error finding wallet by ID:', error);
      throw error;
    }
  }

  // Find wallet by ID and user ID
  async findByIdAndUserId(walletId, userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        _id: new ObjectId(String(walletId)),
        userId: new ObjectId(String(userId))
      });
    } catch (error) {
      logger.error('Error finding wallet by ID and user ID:', error);
      throw error;
    }
  }

  // Get user's default wallet
  async getDefaultWallet(userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        userId: new ObjectId(String(userId)),
        isDefault: true,
        isActive: true
      });
    } catch (error) {
      logger.error('Error getting default wallet:', error);
      throw error;
    }
  }

  // Get all wallets for a user
  async findByUserId(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = { userId: new ObjectId(String(userId)) };
      if (isActive !== null) {
        filter.isActive = isActive;
      }

      const [wallets, total] = await Promise.all([
        collection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        wallets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding wallets by user ID:', error);
      throw error;
    }
  }

  // Update wallet
  async updateById(walletId, updateData) {
    try {
      const collection = this.getCollection();
      updateData.updatedAt = new Date();
      
      const result = await collection.updateOne(
        { _id: new ObjectId(String(walletId)) },
        { $set: updateData }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating wallet:', error);
      throw error;
    }
  }

  // Delete wallet
  async deleteById(walletId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(String(walletId)) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting wallet:', error);
      throw error;
    }
  }

  // Set default wallet
  async setDefaultWallet(walletId, userId) {
    try {
      const collection = this.getCollection();
      
      // Remove default from all other wallets
      await collection.updateMany(
        { userId: new ObjectId(String(userId)) },
        { $set: { isDefault: false } }
      );
      
      // Set this wallet as default
      const result = await collection.updateOne(
        { _id: new ObjectId(String(walletId)) },
        { $set: { isDefault: true, updatedAt: new Date() } }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error setting default wallet:', error);
      throw error;
    }
  }

  // Add income to wallet
  async addIncome(walletId, amount) {
    try {
      const collection = this.getCollection();
      
      const result = await collection.updateOne(
        { _id: new ObjectId(String(walletId)) },
        {
          $inc: { balance: amount },
          $set: {
            lastTransactionAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error adding income to wallet:', error);
      throw error;
    }
  }

  // Add expense to wallet
  async addExpense(walletId, amount) {
    try {
      const collection = this.getCollection();
      
      const result = await collection.updateOne(
        { _id: new ObjectId(String(walletId)) },
        {
          $inc: { balance: -amount },
          $set: {
            lastTransactionAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error adding expense to wallet:', error);
      throw error;
    }
  }

  // Transfer between wallets
  async transferBetweenWallets(fromWalletId, toWalletId, amount) {
    try {
      const collection = this.getCollection();
      
      // Use a session for transaction-like behavior
      const session = database.getClient().startSession();
      
      try {
        await session.withTransaction(async () => {
          // Deduct from source wallet
          await collection.updateOne(
            { _id: new ObjectId(String(fromWalletId)) },
            {
              $inc: { balance: -amount },
              $set: {
                lastTransactionAt: new Date(),
                updatedAt: new Date()
              }
            },
            { session }
          );
          
          // Add to destination wallet
          await collection.updateOne(
            { _id: new ObjectId(String(toWalletId)) },
            {
              $inc: { balance: amount },
              $set: {
                lastTransactionAt: new Date(),
                updatedAt: new Date()
              }
            },
            { session }
          );
        });
        
        return true;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      logger.error('Error transferring between wallets:', error);
      throw error;
    }
  }

  // Get wallet statistics
  async getStats(userId) {
    try {
      const collection = this.getCollection();
      
      const stats = await collection.aggregate([
        { $match: { userId: new ObjectId(String(userId)) } },
        {
          $group: {
            _id: null,
            totalWallets: { $sum: 1 },
            totalBalance: { $sum: '$balance' },
            activeWallets: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            defaultWallet: {
              $first: {
                $cond: ['$isDefault', '$_id', null]
              }
            }
          }
        }
      ]).toArray();

      return stats[0] || {
        totalWallets: 0,
        totalBalance: 0,
        activeWallets: 0,
        defaultWallet: null
      };
    } catch (error) {
      logger.error('Error getting wallet stats:', error);
      throw error;
    }
  }

  // Get wallets by currency
  async findByCurrency(userId, currency) {
    try {
      const collection = this.getCollection();
      return await collection.find({
        userId: new ObjectId(String(userId)),
        currency: currency,
        isActive: true
      }).toArray();
    } catch (error) {
      logger.error('Error finding wallets by currency:', error);
      throw error;
    }
  }

  // Check if wallet has sufficient balance
  async hasSufficientBalance(walletId, amount) {
    try {
      const collection = this.getCollection();
      const wallet = await collection.findOne({ _id: new ObjectId(String(walletId)) });
      
      if (!wallet) {
        return false;
      }
      
      if (wallet.settings?.allowNegativeBalance) {
        return true;
      }
      
      return wallet.balance >= amount;
    } catch (error) {
      logger.error('Error checking wallet balance:', error);
      throw error;
    }
  }
}

module.exports = Wallet;
