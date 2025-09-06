const { ObjectId } = require('mongodb');
const database = require('../config/database');
const logger = require('../utils/logger');

class Category {
  constructor() {
    this.collection = 'categories';
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
      await collection.createIndex({ userId: 1, name: 1 }, { unique: true });
      await collection.createIndex({ userId: 1, isActive: 1 });
      await collection.createIndex({ type: 1 });
      await collection.createIndex({ createdAt: -1 });
      logger.info('Category indexes created successfully');
    } catch (error) {
      logger.error('Error creating category indexes:', error);
    }
  }

  // Create new category
  async create(categoryData) {
    try {
      const collection = this.getCollection();

      const category = {
        userId: new ObjectId(categoryData.userId),
        name: categoryData.name.trim(),
        description: categoryData.description || '',
        color: categoryData.color || '#3B82F6',
        icon: categoryData.icon || 'folder',
        type: categoryData.type || 'expense', // 'expense' or 'income'
        isActive: true,
        isDefault: categoryData.isDefault || false,
        labelCount: 0,
        metadata: {
          createdFrom: categoryData.metadata?.createdFrom || 'manual',
          priority: categoryData.metadata?.priority || 'medium',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(category);
      category._id = result.insertedId;

      return category;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  // Find category by ID
  async findById(categoryId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({ _id: new ObjectId(categoryId) });
    } catch (error) {
      logger.error('Error finding category by ID:', error);
      throw error;
    }
  }

  // Find category by ID and user ID
  async findByIdAndUserId(categoryId, userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        _id: new ObjectId(categoryId),
        userId: new ObjectId(userId),
      });
    } catch (error) {
      logger.error('Error finding category by ID and user ID:', error);
      throw error;
    }
  }

  // Find category by name and user ID
  async findByNameAndUserId(name, userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        name: name.trim(),
        userId: new ObjectId(userId),
      });
    } catch (error) {
      logger.error('Error finding category by name and user ID:', error);
      throw error;
    }
  }

  // Get all categories for a user
  async findByUserId(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        isActive = null,
        type = null,
        search = '',
        sortBy = 'name',
        sortOrder = 'asc',
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = { userId: new ObjectId(userId) };
      if (isActive !== null) {
        filter.isActive = isActive;
      }
      if (type) {
        filter.type = type;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const [categories, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        categories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding categories by user ID:', error);
      throw error;
    }
  }

  // Update category
  async updateById(categoryId, updateData) {
    try {
      const collection = this.getCollection();
      updateData.updatedAt = new Date();

      const result = await collection.updateOne(
        { _id: new ObjectId(categoryId) },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category
  async deleteById(categoryId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(categoryId) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  // Get categories by type
  async findByType(userId, type) {
    try {
      const collection = this.getCollection();

      return await collection
        .find({
          userId: new ObjectId(userId),
          isActive: true,
          type: type,
        })
        .sort({ name: 1 })
        .toArray();
    } catch (error) {
      logger.error('Error finding categories by type:', error);
      throw error;
    }
  }

  // Get category statistics
  async getStats(userId) {
    try {
      const collection = this.getCollection();

      const stats = await collection
        .aggregate([
          { $match: { userId: new ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalCategories: { $sum: 1 },
              activeCategories: {
                $sum: { $cond: ['$isActive', 1, 0] },
              },
              expenseCategories: {
                $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] },
              },
              incomeCategories: {
                $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] },
              },
              totalLabels: { $sum: '$labelCount' },
            },
          },
        ])
        .toArray();

      return (
        stats[0] || {
          totalCategories: 0,
          activeCategories: 0,
          expenseCategories: 0,
          incomeCategories: 0,
          totalLabels: 0,
        }
      );
    } catch (error) {
      logger.error('Error getting category stats:', error);
      throw error;
    }
  }

  // Increment label count
  async incrementLabelCount(categoryId) {
    try {
      const collection = this.getCollection();

      const result = await collection.updateOne(
        { _id: new ObjectId(categoryId) },
        {
          $inc: { labelCount: 1 },
          $set: {
            updatedAt: new Date(),
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error incrementing category label count:', error);
      throw error;
    }
  }

  // Decrement label count
  async decrementLabelCount(categoryId) {
    try {
      const collection = this.getCollection();

      const result = await collection.updateOne(
        { _id: new ObjectId(categoryId) },
        {
          $inc: { labelCount: -1 },
          $set: {
            updatedAt: new Date(),
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error decrementing category label count:', error);
      throw error;
    }
  }

  // Search categories
  async search(userId, query, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        isActive = null,
        type = null,
        sortBy = 'name',
        sortOrder = 'asc',
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = {
        userId: new ObjectId(userId),
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      };

      if (isActive !== null) {
        filter.isActive = isActive;
      }
      if (type) {
        filter.type = type;
      }

      const [categories, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        categories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching categories:', error);
      throw error;
    }
  }

  // Create default categories for user
  async createDefaultCategories(userId) {
    try {
      const collection = this.getCollection();

      const defaultCategories = [
        {
          name: 'Food & Dining',
          description: 'Restaurants, groceries, and dining expenses',
          color: '#EF4444',
          icon: 'food',
          type: 'expense',
        },
        {
          name: 'Transportation',
          description: 'Fuel, public transport, and vehicle expenses',
          color: '#3B82F6',
          icon: 'car',
          type: 'expense',
        },
        {
          name: 'Shopping',
          description: 'Clothing, electronics, and retail purchases',
          color: '#8B5CF6',
          icon: 'shopping',
          type: 'expense',
        },
        {
          name: 'Entertainment',
          description: 'Movies, games, and leisure activities',
          color: '#10B981',
          icon: 'entertainment',
          type: 'expense',
        },
        {
          name: 'Healthcare',
          description: 'Medical expenses and healthcare costs',
          color: '#F59E0B',
          icon: 'health',
          type: 'expense',
        },
        {
          name: 'Bills & Utilities',
          description: 'Electricity, water, internet, and other bills',
          color: '#F97316',
          icon: 'receipt',
          type: 'expense',
        },
        {
          name: 'Salary',
          description: 'Regular income from employment',
          color: '#059669',
          icon: 'briefcase',
          type: 'income',
        },
        {
          name: 'Freelance',
          description: 'Additional income from freelance work',
          color: '#7C3AED',
          icon: 'briefcase',
          type: 'income',
        },
        {
          name: 'Investment',
          description: 'Investment returns and dividends',
          color: '#0D9488',
          icon: 'trending-up',
          type: 'income',
        },
        {
          name: 'Other Income',
          description: 'Other sources of income',
          color: '#6B7280',
          icon: 'plus-circle',
          type: 'income',
        },
      ];

      const categoriesToInsert = defaultCategories.map(category => ({
        ...category,
        userId: new ObjectId(userId),
        isActive: true,
        isDefault: false,
        labelCount: 0,
        metadata: {
          createdFrom: 'system',
          priority: 'medium',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await collection.insertMany(categoriesToInsert);

      logger.info(
        `Created ${result.insertedCount} default categories for user ${userId}`
      );
      return result.insertedIds;
    } catch (error) {
      logger.error('Error creating default categories:', error);
      throw error;
    }
  }

  // Bulk update categories
  async bulkUpdate(userId, updates) {
    try {
      const collection = this.getCollection();
      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: {
            _id: new ObjectId(update.categoryId),
            userId: new ObjectId(userId),
          },
          update: {
            $set: {
              ...update.data,
              updatedAt: new Date(),
            },
          },
        },
      }));

      const result = await collection.bulkWrite(bulkOps);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error bulk updating categories:', error);
      throw error;
    }
  }
}

module.exports = Category;
