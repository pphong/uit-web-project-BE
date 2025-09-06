const { ObjectId } = require('mongodb');
const database = require('../config/database');
const logger = require('../utils/logger');

class Label {
  constructor() {
    this.collection = 'labels';
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
      await collection.createIndex({ userId: 1, isDefault: 1 });
      await collection.createIndex({ userId: 1, isActive: 1 });
      await collection.createIndex({ categoryId: 1 });
      await collection.createIndex({ userId: 1, categoryId: 1 });
      await collection.createIndex({ usageCount: -1 });
      await collection.createIndex({ lastUsedAt: -1 });
      logger.info('Label indexes created successfully');
    } catch (error) {
      logger.error('Error creating label indexes:', error);
    }
  }

  // Create new label
  async create(labelData) {
    try {
      const collection = this.getCollection();

      const label = {
        userId: new ObjectId(labelData.userId),
        categoryId: labelData.categoryId ? new ObjectId(labelData.categoryId) : null,
        name: labelData.name.trim(),
        color: labelData.color || '#3B82F6',
        description: labelData.description || '',
        icon: labelData.icon || 'tag',
        isActive: true,
        isDefault: labelData.isDefault || false,
        usageCount: 0,
        lastUsedAt: null,
        metadata: {
          createdFrom: labelData.metadata?.createdFrom || 'manual',
          priority: labelData.metadata?.priority || 'medium',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(label);
      label._id = result.insertedId;

      return label;
    } catch (error) {
      logger.error('Error creating label:', error);
      throw error;
    }
  }

  // Find label by ID
  async findById(labelId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({ _id: new ObjectId(labelId) });
    } catch (error) {
      logger.error('Error finding label by ID:', error);
      throw error;
    }
  }

  // Find label by ID and user ID
  async findByIdAndUserId(labelId, userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        _id: new ObjectId(labelId),
        userId: new ObjectId(userId),
      });
    } catch (error) {
      logger.error('Error finding label by ID and user ID:', error);
      throw error;
    }
  }

  // Find label by name and user ID
  async findByNameAndUserId(name, userId) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({
        name: name.trim(),
        userId: new ObjectId(userId),
      });
    } catch (error) {
      logger.error('Error finding label by name and user ID:', error);
      throw error;
    }
  }

  // Get all labels for a user
  async findByUserId(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        isActive = null,
        isDefault = null,
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
      if (isDefault !== null) {
        filter.isDefault = isDefault;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const [labels, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        labels,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding labels by user ID:', error);
      throw error;
    }
  }

  // Update label
  async updateById(labelId, updateData) {
    try {
      const collection = this.getCollection();
      updateData.updatedAt = new Date();

      const result = await collection.updateOne(
        { _id: new ObjectId(labelId) },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating label:', error);
      throw error;
    }
  }

  // Delete label
  async deleteById(labelId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(labelId) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting label:', error);
      throw error;
    }
  }

  // Set default label
  async setDefaultLabel(labelId, userId) {
    try {
      const collection = this.getCollection();

      // Remove default from all other labels
      await collection.updateMany(
        { userId: new ObjectId(userId) },
        { $set: { isDefault: false } }
      );

      // Set this label as default
      const result = await collection.updateOne(
        { _id: new ObjectId(labelId) },
        { $set: { isDefault: true, updatedAt: new Date() } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error setting default label:', error);
      throw error;
    }
  }

  // Increment usage count
  async incrementUsage(labelId) {
    try {
      const collection = this.getCollection();

      const result = await collection.updateOne(
        { _id: new ObjectId(labelId) },
        {
          $inc: { usageCount: 1 },
          $set: {
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error incrementing label usage:', error);
      throw error;
    }
  }

  // Get label statistics
  async getStats(userId) {
    try {
      const collection = this.getCollection();

      const stats = await collection
        .aggregate([
          { $match: { userId: new ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalLabels: { $sum: 1 },
              activeLabels: {
                $sum: { $cond: ['$isActive', 1, 0] },
              },
              defaultLabels: {
                $sum: { $cond: ['$isDefault', 1, 0] },
              },
              totalUsage: { $sum: '$usageCount' },
              averageUsage: { $avg: '$usageCount' },
            },
          },
        ])
        .toArray();

      return (
        stats[0] || {
          totalLabels: 0,
          activeLabels: 0,
          defaultLabels: 0,
          totalUsage: 0,
          averageUsage: 0,
        }
      );
    } catch (error) {
      logger.error('Error getting label stats:', error);
      throw error;
    }
  }

  // Get most used labels
  async getMostUsedLabels(userId, limit = 10) {
    try {
      const collection = this.getCollection();

      return await collection
        .find({
          userId: new ObjectId(userId),
          isActive: true,
        })
        .sort({ usageCount: -1, lastUsedAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      logger.error('Error getting most used labels:', error);
      throw error;
    }
  }

  // Get recently used labels
  async getRecentlyUsedLabels(userId, limit = 10) {
    try {
      const collection = this.getCollection();

      return await collection
        .find({
          userId: new ObjectId(userId),
          isActive: true,
          lastUsedAt: { $ne: null },
        })
        .sort({ lastUsedAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      logger.error('Error getting recently used labels:', error);
      throw error;
    }
  }

  // Get labels by category ID
  async findByCategoryId(userId, categoryId) {
    try {
      const collection = this.getCollection();

      return await collection
        .find({
          userId: new ObjectId(userId),
          categoryId: new ObjectId(categoryId),
          isActive: true,
        })
        .sort({ name: 1 })
        .toArray();
    } catch (error) {
      logger.error('Error finding labels by category ID:', error);
      throw error;
    }
  }

  // Get labels by category (legacy method for backward compatibility)
  async findByCategory(userId, category) {
    try {
      const collection = this.getCollection();

      return await collection
        .find({
          userId: new ObjectId(userId),
          isActive: true,
          'metadata.category': category,
        })
        .toArray();
    } catch (error) {
      logger.error('Error finding labels by category:', error);
      throw error;
    }
  }

  // Search labels
  async search(userId, query, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        isActive = null,
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

      const [labels, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        labels,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching labels:', error);
      throw error;
    }
  }

  // Create default labels for user
  async createDefaultLabels(userId, categoryMap = {}) {
    try {
      const collection = this.getCollection();

      const defaultLabels = [
        {
          name: 'Restaurants',
          color: '#EF4444',
          icon: 'food',
          description: 'Dining out and restaurant expenses',
          categoryType: 'expense',
        },
        {
          name: 'Groceries',
          color: '#F97316',
          icon: 'shopping-cart',
          description: 'Grocery shopping and food items',
          categoryType: 'expense',
        },
        {
          name: 'Public Transport',
          color: '#3B82F6',
          icon: 'bus',
          description: 'Bus, train, and public transport',
          categoryType: 'expense',
        },
        {
          name: 'Fuel',
          color: '#1D4ED8',
          icon: 'car',
          description: 'Gas and fuel expenses',
          categoryType: 'expense',
        },
        {
          name: 'Clothing',
          color: '#8B5CF6',
          icon: 'shirt',
          description: 'Clothing and fashion items',
          categoryType: 'expense',
        },
        {
          name: 'Electronics',
          color: '#7C3AED',
          icon: 'smartphone',
          description: 'Electronics and gadgets',
          categoryType: 'expense',
        },
        {
          name: 'Movies & Shows',
          color: '#10B981',
          icon: 'film',
          description: 'Entertainment and streaming',
          categoryType: 'expense',
        },
        {
          name: 'Games',
          color: '#059669',
          icon: 'gamepad',
          description: 'Gaming and recreational activities',
          categoryType: 'expense',
        },
        {
          name: 'Medical',
          color: '#F59E0B',
          icon: 'heart',
          description: 'Medical expenses and healthcare',
          categoryType: 'expense',
        },
        {
          name: 'Regular Salary',
          color: '#059669',
          icon: 'briefcase',
          description: 'Regular income from employment',
          categoryType: 'income',
        },
        {
          name: 'Freelance Work',
          color: '#7C3AED',
          icon: 'laptop',
          description: 'Additional income from freelance work',
          categoryType: 'income',
        },
        {
          name: 'Investment Returns',
          color: '#0D9488',
          icon: 'trending-up',
          description: 'Investment returns and dividends',
          categoryType: 'income',
        },
      ];

      const labelsToInsert = defaultLabels.map(label => ({
        name: label.name,
        color: label.color,
        icon: label.icon,
        description: label.description,
        categoryId: categoryMap[label.categoryType] || null,
        userId: new ObjectId(userId),
        isActive: true,
        isDefault: false,
        usageCount: 0,
        lastUsedAt: null,
        metadata: {
          createdFrom: 'system',
          priority: 'medium',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Set the first label as default
      labelsToInsert[0].isDefault = true;

      const result = await collection.insertMany(labelsToInsert);

      logger.info(
        `Created ${result.insertedCount} default labels for user ${userId}`
      );
      return result.insertedIds;
    } catch (error) {
      logger.error('Error creating default labels:', error);
      throw error;
    }
  }

  // Bulk update labels
  async bulkUpdate(userId, updates) {
    try {
      const collection = this.getCollection();
      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: {
            _id: new ObjectId(update.labelId),
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
      logger.error('Error bulk updating labels:', error);
      throw error;
    }
  }
}

module.exports = new Label();
