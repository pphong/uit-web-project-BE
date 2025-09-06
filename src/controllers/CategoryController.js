const Category = require('../models/Category');
const Label = require('../models/Label');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class CategoryController {
  constructor() {
    this.categoryModel = Category;
    this.labelModel = Label;
  }

  // Get user categories
  async getUserCategories(req, res) {
    try {
      const userId = req.user.userId;
      const {
        page = 1,
        limit = 10,
        isActive = null,
        type = null,
        search = '',
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        isActive: isActive === null ? null : isActive === 'true',
        type,
        search,
        sortBy,
        sortOrder
      };

      const result = await this.categoryModel.findByUserId(userId, options);

      return ApiResponse.success(res, 'Categories retrieved successfully', {
        categories: result.categories,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting user categories:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve categories');
    }
  }

  // Get category statistics
  async getCategoryStats(req, res) {
    try {
      const userId = req.user.userId;
      const stats = await this.categoryModel.getStats(userId);

      return ApiResponse.success(res, 'Category statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Error getting category stats:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve category statistics');
    }
  }

  // Get categories by type
  async getCategoriesByType(req, res) {
    try {
      const userId = req.user.userId;
      const { type } = req.params;

      if (!['expense', 'income'].includes(type)) {
        return ApiResponse.badRequest(res, 'Invalid category type. Must be "expense" or "income"');
      }

      const categories = await this.categoryModel.findByType(userId, type);

      return ApiResponse.success(res, `${type} categories retrieved successfully`, {
        categories,
        type
      });
    } catch (error) {
      logger.error('Error getting categories by type:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve categories by type');
    }
  }

  // Get category by ID
  async getCategoryById(req, res) {
    try {
      const { categoryId } = req.params;
      const userId = req.user.userId;

      const category = await this.categoryModel.findByIdAndUserId(categoryId, userId);
      if (!category) {
        return ApiResponse.notFound(res, 'Category not found');
      }

      // Get labels in this category
      const labels = await this.labelModel.findByCategoryId(userId, categoryId);

      return ApiResponse.success(res, 'Category retrieved successfully', {
        category: {
          ...category,
          labels
        }
      });
    } catch (error) {
      logger.error('Error getting category by ID:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve category');
    }
  }

  // Create new category
  async createCategory(req, res) {
    try {
      const userId = req.user.userId;
      const categoryData = { ...req.body, userId };

      // Check if category name already exists for this user
      const existingCategory = await this.categoryModel.findByNameAndUserId(categoryData.name, userId);
      if (existingCategory) {
        return ApiResponse.conflict(res, 'Category name already exists for this user');
      }

      const category = await this.categoryModel.create(categoryData);

      return ApiResponse.created(res, 'Category created successfully', { category });
    } catch (error) {
      logger.error('Error creating category:', error);
      if (error.code === 11000) {
        return ApiResponse.conflict(res, 'Category name already exists for this user');
      }
      return ApiResponse.internalServerError(res, 'Failed to create category');
    }
  }

  // Update category
  async updateCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;

      const category = await this.categoryModel.findByIdAndUserId(categoryId, userId);
      if (!category) {
        return ApiResponse.notFound(res, 'Category not found');
      }

      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name !== category.name) {
        const existingCategory = await this.categoryModel.findByNameAndUserId(updateData.name, userId);
        if (existingCategory && existingCategory._id.toString() !== categoryId) {
          return ApiResponse.conflict(res, 'Category name already exists for this user');
        }
      }

      const success = await this.categoryModel.updateById(categoryId, updateData);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to update category');
      }

      const updatedCategory = await this.categoryModel.findById(categoryId);

      return ApiResponse.success(res, 'Category updated successfully', { category: updatedCategory });
    } catch (error) {
      logger.error('Error updating category:', error);
      return ApiResponse.internalServerError(res, 'Failed to update category');
    }
  }

  // Delete category
  async deleteCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const userId = req.user.userId;

      const category = await this.categoryModel.findByIdAndUserId(categoryId, userId);
      if (!category) {
        return ApiResponse.notFound(res, 'Category not found');
      }

      // Check if category has labels
      if (category.labelCount > 0) {
        return ApiResponse.badRequest(res, 'Cannot delete category that has labels. Please move or delete labels first.');
      }

      const success = await this.categoryModel.deleteById(categoryId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to delete category');
      }

      return ApiResponse.success(res, 'Category deleted successfully');
    } catch (error) {
      logger.error('Error deleting category:', error);
      return ApiResponse.internalServerError(res, 'Failed to delete category');
    }
  }

  // Search categories
  async searchCategories(req, res) {
    try {
      const userId = req.user.userId;
      const { query } = req.query;
      const {
        page = 1,
        limit = 10,
        isActive = null,
        type = null,
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
        type,
        sortBy,
        sortOrder
      };

      const result = await this.categoryModel.search(userId, query.trim(), options);

      return ApiResponse.success(res, 'Category search completed', {
        categories: result.categories,
        pagination: result.pagination,
        searchQuery: query
      });
    } catch (error) {
      logger.error('Error searching categories:', error);
      return ApiResponse.internalServerError(res, 'Failed to search categories');
    }
  }

  // Get labels in category
  async getCategoryLabels(req, res) {
    try {
      const userId = req.user.userId;
      const { categoryId } = req.params;

      const category = await this.categoryModel.findByIdAndUserId(categoryId, userId);
      if (!category) {
        return ApiResponse.notFound(res, 'Category not found');
      }

      const labels = await this.labelModel.findByCategoryId(userId, categoryId);

      return ApiResponse.success(res, 'Category labels retrieved successfully', {
        category: {
          _id: category._id,
          name: category.name,
          type: category.type
        },
        labels
      });
    } catch (error) {
      logger.error('Error getting category labels:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve category labels');
    }
  }

  // Create default categories for user
  async createDefaultCategories(req, res) {
    try {
      const userId = req.user.userId;

      // Check if user already has categories
      const existingCategories = await this.categoryModel.findByUserId(userId, { page: 1, limit: 1 });
      if (existingCategories.categories.length > 0) {
        return ApiResponse.badRequest(res, 'User already has categories');
      }

      const categoryIds = await this.categoryModel.createDefaultCategories(userId);

      // Create default labels with category mapping
      const expenseCategoryId = categoryIds[0]; // First category is Food & Dining (expense)
      const incomeCategoryId = categoryIds[6]; // Salary category (income)

      const categoryMap = {
        expense: expenseCategoryId,
        income: incomeCategoryId
      };

      await this.labelModel.createDefaultLabels(userId, categoryMap);

      return ApiResponse.created(res, 'Default categories and labels created successfully', {
        categoryCount: categoryIds.length,
        message: 'Default categories and labels have been created for your account'
      });
    } catch (error) {
      logger.error('Error creating default categories:', error);
      return ApiResponse.internalServerError(res, 'Failed to create default categories');
    }
  }

  // Bulk update categories
  async bulkUpdateCategories(req, res) {
    try {
      const userId = req.user.userId;
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return ApiResponse.badRequest(res, 'Updates array is required');
      }

      const modifiedCount = await this.categoryModel.bulkUpdate(userId, updates);

      return ApiResponse.success(res, 'Categories updated successfully', {
        modifiedCount
      });
    } catch (error) {
      logger.error('Error bulk updating categories:', error);
      return ApiResponse.internalServerError(res, 'Failed to bulk update categories');
    }
  }
}

module.exports = new CategoryController();
