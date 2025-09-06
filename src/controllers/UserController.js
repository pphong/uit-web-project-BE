const User = require('../models/User');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class UserController {
  constructor() {
    this.userModel = new User();
  }

  // Get all users with pagination and search
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        role = '',
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        role,
        isActive: isActive === null ? null : isActive === 'true',
        sortBy,
        sortOrder
      };

      const result = await this.userModel.findAll(options);

      return ApiResponse.success(res, 'Users retrieved successfully', {
        users: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting all users:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve users');
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const stats = await this.userModel.getStats();

      return ApiResponse.success(res, 'User statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve user statistics');
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;

      const user = await this.userModel.findById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, 'User retrieved successfully', { user });
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve user');
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated
      const { password, email, ...safeUpdateData } = updateData;

      const success = await this.userModel.updateById(userId, safeUpdateData);
      if (!success) {
        return ApiResponse.notFound(res, 'User not found or no changes made');
      }

      const updatedUser = await this.userModel.findById(userId);

      return ApiResponse.success(res, 'User updated successfully', { user: updatedUser });
    } catch (error) {
      logger.error('Error updating user:', error);
      return ApiResponse.internalServerError(res, 'Failed to update user');
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      const success = await this.userModel.deleteById(userId);
      if (!success) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, 'User deleted successfully');
    } catch (error) {
      logger.error('Error deleting user:', error);
      return ApiResponse.internalServerError(res, 'Failed to delete user');
    }
  }

  // Activate user
  async activateUser(req, res) {
    try {
      const { userId } = req.params;

      const success = await this.userModel.updateById(userId, { isActive: true });
      if (!success) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const activatedUser = await this.userModel.findById(userId);

      return ApiResponse.success(res, 'User activated successfully', { user: activatedUser });
    } catch (error) {
      logger.error('Error activating user:', error);
      return ApiResponse.internalServerError(res, 'Failed to activate user');
    }
  }

  // Deactivate user
  async deactivateUser(req, res) {
    try {
      const { userId } = req.params;

      const success = await this.userModel.updateById(userId, { isActive: false });
      if (!success) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const deactivatedUser = await this.userModel.findById(userId);

      return ApiResponse.success(res, 'User deactivated successfully', { user: deactivatedUser });
    } catch (error) {
      logger.error('Error deactivating user:', error);
      return ApiResponse.internalServerError(res, 'Failed to deactivate user');
    }
  }

  // Get user profile (for the authenticated user)
  async getUserProfile(req, res) {
    try {
      const userId = req.user.userId;

      const user = await this.userModel.findById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, 'Profile retrieved successfully', { user });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve profile');
    }
  }

  // Update user profile (for the authenticated user)
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated
      const { password, email, role, ...safeUpdateData } = updateData;

      const success = await this.userModel.updateById(userId, safeUpdateData);
      if (!success) {
        return ApiResponse.notFound(res, 'User not found or no changes made');
      }

      const updatedUser = await this.userModel.findById(userId);

      return ApiResponse.success(res, 'Profile updated successfully', { user: updatedUser });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      return ApiResponse.internalServerError(res, 'Failed to update profile');
    }
  }

  // Search users
  async searchUsers(req, res) {
    try {
      const {
        query = '',
        page = 1,
        limit = 10,
        role = '',
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      if (!query.trim()) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: query.trim(),
        role,
        isActive: isActive === null ? null : isActive === 'true',
        sortBy,
        sortOrder
      };

      const result = await this.userModel.findAll(options);

      return ApiResponse.success(res, 'Users search completed', {
        users: result.users,
        pagination: result.pagination,
        searchQuery: query
      });
    } catch (error) {
      logger.error('Error searching users:', error);
      return ApiResponse.internalServerError(res, 'Failed to search users');
    }
  }

  // Get users by role
  async getUsersByRole(req, res) {
    try {
      const { role } = req.params;
      const {
        page = 1,
        limit = 10,
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      if (!['admin', 'user'].includes(role)) {
        return ApiResponse.badRequest(res, 'Invalid role. Must be "admin" or "user"');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        role,
        isActive: isActive === null ? null : isActive === 'true',
        sortBy,
        sortOrder
      };

      const result = await this.userModel.findAll(options);

      return ApiResponse.success(res, `Users with role "${role}" retrieved successfully`, {
        users: result.users,
        pagination: result.pagination,
        role
      });
    } catch (error) {
      logger.error('Error getting users by role:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve users by role');
    }
  }

  // Bulk update users
  async bulkUpdateUsers(req, res) {
    try {
      const { userIds, updateData } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return ApiResponse.badRequest(res, 'User IDs array is required');
      }

      if (!updateData || typeof updateData !== 'object') {
        return ApiResponse.badRequest(res, 'Update data is required');
      }

      // Remove sensitive fields
      const { password, email, role, ...safeUpdateData } = updateData;

      let successCount = 0;
      const results = [];

      for (const userId of userIds) {
        try {
          const success = await this.userModel.updateById(userId, safeUpdateData);
          if (success) {
            successCount++;
            results.push({ userId, status: 'success' });
          } else {
            results.push({ userId, status: 'failed', reason: 'User not found' });
          }
        } catch (error) {
          results.push({ userId, status: 'failed', reason: error.message });
        }
      }

      return ApiResponse.success(res, 'Bulk update completed', {
        total: userIds.length,
        successCount,
        failureCount: userIds.length - successCount,
        results
      });
    } catch (error) {
      logger.error('Error bulk updating users:', error);
      return ApiResponse.internalServerError(res, 'Failed to perform bulk update');
    }
  }
}

module.exports = UserController;
