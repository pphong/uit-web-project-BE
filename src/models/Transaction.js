const { ObjectId } = require('mongodb');
const database = require('../config/database');
const logger = require('../utils/logger');

class Transaction {
  constructor() {
    this.collection = 'transactions';
  }

  // Get collection
  getCollection() {
    return database.getCollection(this.collection);
  }

  // Create indexes
  async createIndexes() {
    try {
      const collection = this.getCollection();
      await collection.createIndex({ walletId: 1 });
      await collection.createIndex({ walletId: 1, createdAt: -1 });
      await collection.createIndex({ amount: 1 });
      await collection.createIndex({ currency: 1 });
      await collection.createIndex({ labels: 1 });
      await collection.createIndex({ isDelete: 1 });
      await collection.createIndex({ createdAt: -1 });
      logger.info('Transaction indexes created successfully');
    } catch (error) {
      logger.error('Error creating transaction indexes:', error);
    }
  }

  // Create new transaction
  async create(transactionData) {
    try {
      const collection = this.getCollection();
      
      const transaction = {
        walletId: new ObjectId(transactionData.walletId),
        amount: transactionData.amount,
        currency: transactionData.currency || 'VND',
        description: transactionData.description || '',
        receipt: transactionData.receipt || null,
        labels: transactionData.labels || [],
        receiver: transactionData.receiver || null,
        isDelete: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(transaction);
      transaction._id = result.insertedId;
      
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Find transaction by ID
  async findById(transactionId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({ 
        _id: new ObjectId(transactionId),
        isDelete: false 
      });
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  // Find transaction by ID and wallet ID
  async findByIdAndWalletId(transactionId, walletId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        _id: new ObjectId(transactionId),
        walletId: new ObjectId(walletId),
        isDelete: false
      });
    } catch (error) {
      logger.error('Error finding transaction by ID and wallet ID:', error);
      throw error;
    }
  }

  // Get all transactions for a wallet
  async findByWalletId(walletId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        startDate = null,
        endDate = null,
        minAmount = null,
        maxAmount = null,
        currency = null,
        labels = []
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = { 
        walletId: new ObjectId(walletId),
        isDelete: false 
      };

      if (search) {
        filter.$or = [
          { description: { $regex: search, $options: 'i' } },
          { receiver: { $regex: search, $options: 'i' } }
        ];
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate);
        }
      }

      if (minAmount !== null || maxAmount !== null) {
        filter.amount = {};
        if (minAmount !== null) {
          filter.amount.$gte = minAmount;
        }
        if (maxAmount !== null) {
          filter.amount.$lte = maxAmount;
        }
      }

      if (currency) {
        filter.currency = currency;
      }

      if (labels && labels.length > 0) {
        filter.labels = { $in: labels.map(label => new ObjectId(label)) };
      }

      const [transactions, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding transactions by wallet ID:', error);
      throw error;
    }
  }

  // Update transaction
  async updateById(transactionId, updateData) {
    try {
      const collection = this.getCollection();
      updateData.updatedAt = new Date();

      const result = await collection.updateOne(
        { 
          _id: new ObjectId(transactionId),
          isDelete: false 
        },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Soft delete transaction
  async deleteById(transactionId) {
    try {
      const collection = this.getCollection();
      const result = await collection.updateOne(
        { _id: new ObjectId(transactionId) },
        { 
          $set: { 
            isDelete: true,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Hard delete transaction (permanent)
  async hardDeleteById(transactionId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(transactionId) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error hard deleting transaction:', error);
      throw error;
    }
  }

  // Get transaction statistics for a wallet
  async getStats(walletId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        startDate = null,
        endDate = null,
        currency = null
      } = options;

      const matchFilter = { 
        walletId: new ObjectId(walletId),
        isDelete: false 
      };

      if (startDate || endDate) {
        matchFilter.createdAt = {};
        if (startDate) {
          matchFilter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          matchFilter.createdAt.$lte = new Date(endDate);
        }
      }

      if (currency) {
        matchFilter.currency = currency;
      }

      const stats = await collection
        .aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              averageAmount: { $avg: '$amount' },
              minAmount: { $min: '$amount' },
              maxAmount: { $max: '$amount' }
            }
          }
        ])
        .toArray();

      return stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0
      };
    } catch (error) {
      logger.error('Error getting transaction stats:', error);
      throw error;
    }
  }

  // Get transactions by date range
  async findByDateRange(walletId, startDate, endDate, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const filter = {
        walletId: new ObjectId(walletId),
        isDelete: false,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const [transactions, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding transactions by date range:', error);
      throw error;
    }
  }

  // Search transactions
  async search(walletId, query, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const filter = {
        walletId: new ObjectId(walletId),
        isDelete: false,
        $or: [
          { description: { $regex: query, $options: 'i' } },
          { receiver: { $regex: query, $options: 'i' } }
        ]
      };

      const [transactions, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching transactions:', error);
      throw error;
    }
  }

  // Get recent transactions
  async getRecent(walletId, limit = 10) {
    try {
      const collection = this.getCollection();

      return await collection
        .find({
          walletId: new ObjectId(walletId),
          isDelete: false
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  // Bulk update transactions
  async bulkUpdate(walletId, updates) {
    try {
      const collection = this.getCollection();
      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: {
            _id: new ObjectId(update.transactionId),
            walletId: new ObjectId(walletId),
            isDelete: false
          },
          update: {
            $set: {
              ...update.data,
              updatedAt: new Date()
            }
          }
        }
      }));

      const result = await collection.bulkWrite(bulkOps);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error bulk updating transactions:', error);
      throw error;
    }
  }

  // Bulk soft delete transactions
  async bulkDelete(walletId, transactionIds) {
    try {
      const collection = this.getCollection();
      const result = await collection.updateMany(
        {
          _id: { $in: transactionIds.map(id => new ObjectId(id)) },
          walletId: new ObjectId(walletId),
          isDelete: false
        },
        {
          $set: {
            isDelete: true,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      logger.error('Error bulk deleting transactions:', error);
      throw error;
    }
  }

  // Get transactions by labels
  async findByLabels(walletId, labelIds, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const filter = {
        walletId: new ObjectId(walletId),
        isDelete: false,
        labels: { $in: labelIds.map(id => new ObjectId(id)) }
      };

      const [transactions, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding transactions by labels:', error);
      throw error;
    }
  }
}

module.exports = new Transaction();