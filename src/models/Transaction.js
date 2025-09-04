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
      await collection.createIndex({ userId: 1 });
      await collection.createIndex({ walletId: 1 });
      await collection.createIndex({ userId: 1, date: -1 });
      await collection.createIndex({ userId: 1, type: 1 });
      await collection.createIndex({ userId: 1, category: 1 });
      await collection.createIndex({ amount: 1 });
      await collection.createIndex({ date: -1 });
      await collection.createIndex({ type: 1 });
      await collection.createIndex({ status: 1 });
      await collection.createIndex({ fromWalletId: 1 });
      await collection.createIndex({ toWalletId: 1 });
      await collection.createIndex({ currency: 1 });
      await collection.createIndex({ userId: 1, labels: 1 });
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
        userId: ObjectId.createFromHexString(transactionData.userId),
        walletId: ObjectId.createFromHexString(transactionData.walletId),
        type: transactionData.type, // 'income', 'expense', or 'transfer'
        amount: transactionData.amount,
        currency: transactionData.currency || 'VND',
        description: transactionData.description || '',
        category: transactionData.category || 'other',
        labels: transactionData.labels || [],
        date: new Date(transactionData.date || Date.now()),
        notes: transactionData.notes || '',
        status: transactionData.status || 'completed',
        // Transfer specific fields
        fromWalletId: transactionData.fromWalletId ? ObjectId.createFromHexString(transactionData.fromWalletId) : null,
        fromBudgetId: transactionData.fromBudgetId ? ObjectId.createFromHexString(transactionData.fromBudgetId) : null,
        toWalletId: transactionData.toWalletId ? ObjectId.createFromHexString(transactionData.toWalletId) : null,
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
      return await collection.findOne({ _id: ObjectId.createFromHexString(transactionId) });
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  // Find transaction by ID and user ID
  async findByIdAndUserId(transactionId, userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        _id: ObjectId.createFromHexString(transactionId),
        userId: ObjectId.createFromHexString(userId)
      });
    } catch (error) {
      logger.error('Error finding transaction by ID and user ID:', error);
      throw error;
    }
  }

  // Get all transactions for a user
  async findByUserId(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        walletId = null,
        type = null,
        category = null,
        labels = null,
        startDate = null,
        endDate = null,
        minAmount = null,
        maxAmount = null,
        status = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = { userId: ObjectId.createFromHexString(userId) };
      
      if (walletId) {
        filter.walletId = ObjectId.createFromHexString(walletId);
      }
      if (type) {
        filter.type = type;
      }
      if (category) {
        filter.category = category;
      }
      if (labels && labels.length > 0) {
        filter.labels = { $in: labels };
      }
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.date.$lte = new Date(endDate);
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
      if (status) {
        filter.status = status;
      }

      const [transactions, total] = await Promise.all([
        collection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
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
      logger.error('Error finding transactions by user ID:', error);
      throw error;
    }
  }

  // Update transaction
  async updateById(transactionId, updateData) {
    try {
      const collection = this.getCollection();
      updateData.updatedAt = new Date();
      
      const result = await collection.updateOne(
        { _id: ObjectId.createFromHexString(transactionId) },
        { $set: updateData }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete transaction
  async deleteById(transactionId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: ObjectId.createFromHexString(transactionId) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Get transactions by label
  async findByLabelId(userId, labelId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        startDate = null,
        endDate = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = {
        userId: ObjectId.createFromHexString(userId),
        labels: ObjectId.createFromHexString(labelId)
      };

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.date.$lte = new Date(endDate);
        }
      }

      const [transactions, total] = await Promise.all([
        collection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
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
      logger.error('Error finding transactions by label:', error);
      throw error;
    }
  }

  // Add label to transaction
  async addLabel(transactionId, labelId) {
    try {
      const collection = this.getCollection();
      
      const result = await collection.updateOne(
        { _id: ObjectId.createFromHexString(transactionId) },
        {
          $addToSet: { labels: ObjectId.createFromHexString(labelId) },
          $set: { updatedAt: new Date() }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error adding label to transaction:', error);
      throw error;
    }
  }

  // Remove label from transaction
  async removeLabel(transactionId, labelId) {
    try {
      const collection = this.getCollection();
      
      const result = await collection.updateOne(
        { _id: ObjectId.createFromHexString(transactionId) },
        {
          $pull: { labels: ObjectId.createFromHexString(labelId) },
          $set: { updatedAt: new Date() }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error removing label from transaction:', error);
      throw error;
    }
  }

  // Get transaction statistics
  async getStats(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        startDate = null,
        endDate = null,
        walletId = null,
        type = null,
        category = null
      } = options;

      // Build match filter
      const matchFilter = { userId: ObjectId.createFromHexString(userId) };
      if (walletId) {
        matchFilter.walletId = ObjectId.createFromHexString(walletId);
      }
      if (type) {
        matchFilter.type = type;
      }
      if (category) {
        matchFilter.category = category;
      }
      if (startDate || endDate) {
        matchFilter.date = {};
        if (startDate) {
          matchFilter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          matchFilter.date.$lte = new Date(endDate);
        }
      }

      const stats = await collection.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalIncome: {
              $sum: {
                $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
              }
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
              }
            },
            netAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' },
            categories: { $addToSet: '$category' },
            labels: { $addToSet: '$labels' }
          }
        }
      ]).toArray();

      // Get category breakdown
      const categoryBreakdown = await collection.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            income: {
              $sum: {
                $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
              }
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
              }
            }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]).toArray();

      // Get monthly breakdown
      const monthlyBreakdown = await collection.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            income: {
              $sum: {
                $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
              }
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
              }
            }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
      ]).toArray();

      // Get type breakdown
      const typeBreakdown = await collection.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]).toArray();

      return {
        summary: stats[0] || {
          totalTransactions: 0,
          totalIncome: 0,
          totalExpense: 0,
          netAmount: 0,
          averageAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          categories: [],
          labels: []
        },
        categoryBreakdown,
        monthlyBreakdown,
        typeBreakdown
      };
    } catch (error) {
      logger.error('Error getting transaction stats:', error);
      throw error;
    }
  }

  // Get transactions by category
  async findByCategory(userId, category, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        type = null,
        startDate = null,
        endDate = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = {
        userId: ObjectId.createFromHexString(userId),
        category: category
      };

      if (type) {
        filter.type = type;
      }
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.date.$lte = new Date(endDate);
        }
      }

      const [transactions, total] = await Promise.all([
        collection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
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
      logger.error('Error finding transactions by category:', error);
      throw error;
    }
  }

  // Get transactions by type
  async findByType(userId, type, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        startDate = null,
        endDate = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = {
        userId: ObjectId.createFromHexString(userId),
        type: type
      };

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.date.$lte = new Date(endDate);
        }
      }

      const [transactions, total] = await Promise.all([
        collection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
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
      logger.error('Error finding transactions by type:', error);
      throw error;
    }
  }

  // Get recent transactions
  async getRecentTransactions(userId, limit = 10) {
    try {
      const collection = this.getCollection();
      
      return await collection.find({ userId: ObjectId.createFromHexString(userId) })
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }
}

module.exports = new Transaction();
