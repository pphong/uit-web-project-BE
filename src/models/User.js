const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const database = require('../config/database');
const logger = require('../utils/logger');

class User {
  constructor() {
    this.collection = 'users';
  }

  // Get collection
  getCollection() {
    return database.getCollection(this.collection);
  }

  // Create indexes
  async createIndexes() {
    try {
      const collection = this.getCollection();
      await collection.createIndex({ email: 1 }, { unique: true });
      await collection.createIndex({ role: 1 });
      await collection.createIndex({ isActive: 1 });
      await collection.createIndex({ createdAt: -1 });
      logger.info('User indexes created successfully');
    } catch (error) {
      logger.error('Error creating user indexes:', error);
    }
  }

  // Create new user
  async create(userData) {
    try {
      const collection = this.getCollection();

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const user = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        isActive: true,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt: new Date(),
        loginAttempts: 0,
        lockUntil: null,
        lastLoginAt: null,
        profilePicture: userData.profilePicture || null,
        phoneNumber: userData.phoneNumber || null,
        dateOfBirth: userData.dateOfBirth || null,
        address: userData.address || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(user);
      user._id = result.insertedId;

      // Remove password from returned object
      const { password , ...userWithoutPassword } = user;
      password
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by ID
  async findById(userId) {
    try {
      const collection = this.getCollection();
      const user = await collection.findOne({ _id: new ObjectId(String(userId)) });

      if (user) {
        const { password, ...userWithoutPassword } = user;
        password
        return userWithoutPassword;
      }
      return null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const collection = this.getCollection();
      return await collection.findOne({ email: email.toLowerCase() });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Update user
  async updateById(userId, updateData) {
    try {
      const collection = this.getCollection();
      updateData.updatedAt = new Date();

      const result = await collection.updateOne(
        { _id: new ObjectId(String(userId)) },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async deleteById(userId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(String(userId)) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get all users with pagination and search
  async findAll(options = {}) {
    try {
      const collection = this.getCollection();
      const {
        page = 1,
        limit = 10,
        search = '',
        role = '',
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = {};
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }
      if (role) {
        filter.role = role;
      }
      if (isActive !== null) {
        filter.isActive = isActive;
      }

      const [users, total] = await Promise.all([
        collection
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .project({ password: 0 })
          .toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  // Get user statistics
  async getStats() {
    try {
      const collection = this.getCollection();

      const stats = await collection
        .aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: ['$isActive', 1, 0] },
              },
              verifiedUsers: {
                $sum: { $cond: ['$isEmailVerified', 1, 0] },
              },
              adminUsers: {
                $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
              },
            },
          },
        ])
        .toArray();

      return (
        stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          verifiedUsers: 0,
          adminUsers: 0,
        }
      );
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Password comparison
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Generate JWT token
  generateToken(userId, type = 'access') {
    const secret =
      type === 'refresh'
        ? process.env.JWT_REFRESH_SECRET
        : process.env.JWT_SECRET;
    const expiresIn =
      type === 'refresh'
        ? process.env.JWT_REFRESH_EXPIRES_IN
        : process.env.JWT_EXPIRES_IN;

    return jwt.sign({ userId, type }, secret, { expiresIn });
  }

  // Update login attempts
  async updateLoginAttempts(userId, success = false) {
    try {
      const collection = this.getCollection();

      if (success) {
        // Reset on successful login
        await collection.updateOne(
          { _id: new ObjectId(String(userId)) },
          {
            $set: {
              loginAttempts: 0,
              lockUntil: null,
              lastLoginAt: new Date(),
            },
          }
        );
      } else {
        // Increment failed attempts
        const user = await collection.findOne({ _id: new ObjectId(String(userId)) });
        const attempts = (user.loginAttempts || 0) + 1;
        const lockUntil =
          attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // Lock for 15 minutes

        await collection.updateOne(
          { _id: new ObjectId(String(userId)) },
          {
            $set: {
              loginAttempts: attempts,
              lockUntil,
            },
          }
        );
      }
    } catch (error) {
      logger.error('Error updating login attempts:', error);
      throw error;
    }
  }

  // Check if user is locked
  async isLocked(userId) {
    try {
      const collection = this.getCollection();
      const user = await collection.findOne({ _id: new ObjectId(String(userId)) });

      if (!user) {
        return false;
      }

      if (user.lockUntil && user.lockUntil > new Date()) {
        return true;
      }

      // Clear lock if expired
      if (user.lockUntil && user.lockUntil <= new Date()) {
        await collection.updateOne(
          { _id: new ObjectId(String(userId)) },
          {
            $set: {
              lockUntil: null,
              loginAttempts: 0,
            },
          }
        );
      }

      return false;
    } catch (error) {
      logger.error('Error checking if user is locked:', error);
      throw error;
    }
  }
}

module.exports = User;
