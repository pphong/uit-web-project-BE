const Label = require('../models/Label');
const Category = require('../models/Category');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class LabelController {
  constructor() {
    this.labelModel = Label;
    this.categoryModel = Category;
  }

  // Get user labels
  async getUserLabels(req, res) {
    try {
      const userId = req.user.userId;
      const {
        page = 1,
        limit = 10,
        isActive = null,
        isDefault = null,
        search = '',
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        isActive: isActive === null ? null : isActive === 'true',
        isDefault: isDefault === null ? null : isDefault === 'true',
        search,
        sortBy,
        sortOrder
      };

      const result = await this.labelModel.findByUserId(userId, options);

      return ApiResponse.success(res, 'Labels retrieved successfully', {
        labels: result.labels,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting user labels:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve labels');
    }
  }

  // Get label statistics
  async getLabelStats(req, res) {
    try {
      const userId = req.user.userId;
      const stats = await this.labelModel.getStats(userId);

      return ApiResponse.success(res, 'Label statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Error getting label stats:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve label statistics');
    }
  }

  // Get most used labels
  async getMostUsedLabels(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      const labels = await this.labelModel.getMostUsedLabels(userId, parseInt(limit));

      return ApiResponse.success(res, 'Most used labels retrieved successfully', { labels });
    } catch (error) {
      logger.error('Error getting most used labels:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve most used labels');
    }
  }

  // Get recently used labels
  async getRecentlyUsedLabels(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      const labels = await this.labelModel.getRecentlyUsedLabels(userId, parseInt(limit));

      return ApiResponse.success(res, 'Recently used labels retrieved successfully', { labels });
    } catch (error) {
      logger.error('Error getting recently used labels:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve recently used labels');
    }
  }

  // Get label by ID
  async getLabelById(req, res) {
    try {
      const { labelId } = req.params;
      const userId = req.user.userId;

      const label = await this.labelModel.findByIdAndUserId(labelId, userId);
      if (!label) {
        return ApiResponse.notFound(res, 'Label not found');
      }

      return ApiResponse.success(res, 'Label retrieved successfully', { label });
    } catch (error) {
      logger.error('Error getting label by ID:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve label');
    }
  }

  // Create new label
  async createLabel(req, res) {
    try {
      const userId = req.user.userId;
      const labelData = { ...req.body, userId };

      // Check if label name already exists for this user
      const existingLabel = await this.labelModel.findByNameAndUserId(labelData.name, userId);
      if (existingLabel) {
        return ApiResponse.conflict(res, 'Label name already exists for this user');
      }

      // If categoryId is provided, validate it exists and belongs to user
      if (labelData.categoryId) {
        const category = await this.categoryModel.findByIdAndUserId(labelData.categoryId, userId);
        if (!category) {
          return ApiResponse.badRequest(res, 'Invalid category ID');
        }
      }

      const label = await this.labelModel.create(labelData);

      // Increment label count in category if categoryId is provided
      if (labelData.categoryId) {
        await this.categoryModel.incrementLabelCount(labelData.categoryId);
      }

      return ApiResponse.created(res, 'Label created successfully', { label });
    } catch (error) {
      logger.error('Error creating label:', error);
      if (error.code === 11000) {
        return ApiResponse.conflict(res, 'Label name already exists for this user');
      }
      return ApiResponse.internalServerError(res, 'Failed to create label');
    }
  }

  // Update label
  async updateLabel(req, res) {
    try {
      const { labelId } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;

      const label = await this.labelModel.findByIdAndUserId(labelId, userId);
      if (!label) {
        return ApiResponse.notFound(res, 'Label not found');
      }

      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name !== label.name) {
        const existingLabel = await this.labelModel.findByNameAndUserId(updateData.name, userId);
        if (existingLabel && existingLabel._id.toString() !== labelId) {
          return ApiResponse.conflict(res, 'Label name already exists for this user');
        }
      }

      // If categoryId is being updated, validate it exists and belongs to user
      if (updateData.categoryId !== undefined) {
        if (updateData.categoryId) {
          const category = await this.categoryModel.findByIdAndUserId(updateData.categoryId, userId);
          if (!category) {
            return ApiResponse.badRequest(res, 'Invalid category ID');
          }
        }

        // Handle category change
        const oldCategoryId = label.categoryId;
        const newCategoryId = updateData.categoryId;

        if (oldCategoryId && oldCategoryId.toString() !== newCategoryId) {
          // Decrement old category count
          await this.categoryModel.decrementLabelCount(oldCategoryId);
        }

        if (newCategoryId && (!oldCategoryId || oldCategoryId.toString() !== newCategoryId)) {
          // Increment new category count
          await this.categoryModel.incrementLabelCount(newCategoryId);
        }
      }

      const success = await this.labelModel.updateById(labelId, updateData);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to update label');
      }

      const updatedLabel = await this.labelModel.findById(labelId);

      return ApiResponse.success(res, 'Label updated successfully', { label: updatedLabel });
    } catch (error) {
      logger.error('Error updating label:', error);
      return ApiResponse.internalServerError(res, 'Failed to update label');
    }
  }

  // Delete label
  async deleteLabel(req, res) {
    try {
      const { labelId } = req.params;
      const userId = req.user.userId;

      const label = await this.labelModel.findByIdAndUserId(labelId, userId);
      if (!label) {
        return ApiResponse.notFound(res, 'Label not found');
      }

      if (label.isDefault) {
        return ApiResponse.badRequest(res, 'Cannot delete default label');
      }

      if (label.usageCount > 0) {
        return ApiResponse.badRequest(res, 'Cannot delete label that is being used');
      }

      const success = await this.labelModel.deleteById(labelId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to delete label');
      }

      // Decrement label count in category if categoryId exists
      if (label.categoryId) {
        await this.categoryModel.decrementLabelCount(label.categoryId);
      }

      return ApiResponse.success(res, 'Label deleted successfully');
    } catch (error) {
      logger.error('Error deleting label:', error);
      return ApiResponse.internalServerError(res, 'Failed to delete label');
    }
  }

  // Set default label
  async setDefaultLabel(req, res) {
    try {
      const { labelId } = req.params;
      const userId = req.user.userId;

      const label = await this.labelModel.findByIdAndUserId(labelId, userId);
      if (!label) {
        return ApiResponse.notFound(res, 'Label not found');
      }

      const success = await this.labelModel.setDefaultLabel(labelId, userId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to set default label');
      }

      return ApiResponse.success(res, 'Default label set successfully');
    } catch (error) {
      logger.error('Error setting default label:', error);
      return ApiResponse.internalServerError(res, 'Failed to set default label');
    }
  }

  // Search labels
  async searchLabels(req, res) {
    try {
      const userId = req.user.userId;
      const { query } = req.query;
      const {
        page = 1,
        limit = 10,
        isActive = null,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      if (!query || !query.trim()) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        isActive: isActive === null ? null : isActive === 'true',
        sortBy,
        sortOrder
      };

      const result = await this.labelModel.search(userId, query.trim(), options);

      return ApiResponse.success(res, 'Label search completed', {
        labels: result.labels,
        pagination: result.pagination,
        searchQuery: query
      });
    } catch (error) {
      logger.error('Error searching labels:', error);
      return ApiResponse.internalServerError(res, 'Failed to search labels');
    }
  }

  // Get labels by category ID
  async getLabelsByCategoryId(req, res) {
    try {
      const userId = req.user.userId;
      const { categoryId } = req.params;

      // Validate category exists and belongs to user
      const category = await this.categoryModel.findByIdAndUserId(categoryId, userId);
      if (!category) {
        return ApiResponse.notFound(res, 'Category not found');
      }

      const labels = await this.labelModel.findByCategoryId(userId, categoryId);

      return ApiResponse.success(res, `Labels for category "${category.name}" retrieved successfully`, {
        labels,
        category: {
          _id: category._id,
          name: category.name,
          type: category.type
        }
      });
    } catch (error) {
      logger.error('Error getting labels by category ID:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve labels by category');
    }
  }

  // Get labels by category (legacy method for backward compatibility)
  async getLabelsByCategory(req, res) {
    try {
      const userId = req.user.userId;
      const { category } = req.params;

      const labels = await this.labelModel.findByCategory(userId, category);

      return ApiResponse.success(res, `Labels for category "${category}" retrieved successfully`, {
        labels,
        category
      });
    } catch (error) {
      logger.error('Error getting labels by category:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve labels by category');
    }
  }
}

module.exports = new LabelController();
