const Joi = require('joi');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Generic validation middleware using Joi schemas
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        logger.warn(`Validation failed for ${req.method} ${req.originalUrl}:`, {
          errors: errorDetails,
          user: req.user?.email || 'anonymous',
        });

        return ApiResponse.unprocessableEntity(
          res,
          'Validation failed',
          errorDetails
        );
      }

      // Replace request property with validated data
      req[property] = value;
      next();
    } catch (validationError) {
      logger.error('Validation middleware error:', validationError);
      return ApiResponse.internalServerError(res, 'Validation failed', validationError);
    }
  };
};

/**
 * Common validation schemas
 */
const commonSchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'amount', 'date'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),

  // Search query
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    category: Joi.string().optional(),
    label: Joi.string().optional(),
  }),
};

/**
 * User-related validation schemas
 */
const userSchemas = {
  // User registration
  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required(),
    firstName: Joi.string().min(1).max(100).optional(),
    lastName: Joi.string().min(1).max(100).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    dateOfBirth: Joi.date().max('now').optional(),
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // User update
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(100).optional(),
    lastName: Joi.string().min(1).max(100).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    avatar: Joi.string().uri().optional(),
  }),

  // Change password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),

  // Admin user update
  adminUpdateUser: Joi.object({
    firstName: Joi.string().min(1).max(100).optional(),
    lastName: Joi.string().min(1).max(100).optional(),
    email: Joi.string().email().max(255).optional(),
    role: Joi.string().valid('user', 'admin').optional(),
    isActive: Joi.boolean().optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    dateOfBirth: Joi.date().max('now').optional(),
  }),
};

/**
 * Wallet-related validation schemas
 */
const walletSchemas = {
  // Create wallet
  createWallet: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    currency: Joi.string().length(3).uppercase().default('VND'),
    initialBalance: Joi.number().precision(2).min(0).default(0),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    icon: Joi.string().optional(),
  }),

  // Update wallet
  updateWallet: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    icon: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),

  // Wallet transfer
  transfer: Joi.object({
    fromWalletId: commonSchemas.objectId,
    toWalletId: commonSchemas.objectId,
    amount: Joi.number().precision(2).positive().required(),
    description: Joi.string().max(500).optional(),
    date: Joi.date().max('now').default('now'),
  }),
};

/**
 * Transaction-related validation schemas
 */
const transactionSchemas = {
  // Create transaction
  createTransaction: Joi.object({
    amount: Joi.number().precision(2).positive().required(),
    currency: Joi.string().length(3).uppercase().default('VND'),
    description: Joi.string().min(1).max(500).required(),
    receipt: Joi.string().uri().optional().allow(''),
    labels: Joi.array().items(commonSchemas.objectId).max(10).optional(),
    receiver: Joi.string().max(200).optional().allow(''),
  }),

  // Update transaction
  updateTransaction: Joi.object({
    amount: Joi.number().precision(2).positive().optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    description: Joi.string().min(1).max(500).optional(),
    receipt: Joi.string().uri().optional().allow(''),
    labels: Joi.array().items(commonSchemas.objectId).max(10).optional(),
    receiver: Joi.string().max(200).optional().allow(''),
  }),

  // Transaction filters
  transactionFilters: Joi.object({
    search: Joi.string().max(100).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    minAmount: Joi.number().precision(2).min(0).optional(),
    maxAmount: Joi.number().precision(2).min(0).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    labels: Joi.string().optional(), // Comma-separated label IDs
  }).concat(commonSchemas.pagination),

  // Bulk update transactions
  bulkUpdateTransactions: Joi.object({
    updates: Joi.array().items(
      Joi.object({
        transactionId: commonSchemas.objectId,
        data: Joi.object({
          amount: Joi.number().precision(2).positive().optional(),
          currency: Joi.string().length(3).uppercase().optional(),
          description: Joi.string().min(1).max(500).optional(),
          receipt: Joi.string().uri().optional().allow(''),
          labels: Joi.array().items(commonSchemas.objectId).max(10).optional(),
          receiver: Joi.string().max(200).optional().allow(''),
        }).min(1)
      })
    ).min(1).max(100)
  }),

  // Bulk delete transactions
  bulkDeleteTransactions: Joi.object({
    transactionIds: Joi.array().items(commonSchemas.objectId).min(1).max(100).required()
  }),
};

/**
 * Label validation schemas
 */
const labelSchemas = {
  // Create label
  createLabel: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    categoryId: commonSchemas.objectId.optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    description: Joi.string().max(200).optional(),
    icon: Joi.string().max(50).optional(),
    isDefault: Joi.boolean().optional(),
  }),

  // Update label
  updateLabel: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    categoryId: commonSchemas.objectId.optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    description: Joi.string().max(200).optional(),
    icon: Joi.string().max(50).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

/**
 * Category validation schemas
 */
const categorySchemas = {
  // Create category
  createCategory: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('expense', 'income').required(),
    description: Joi.string().max(500).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    icon: Joi.string().max(50).optional(),
    isDefault: Joi.boolean().optional(),
  }),

  // Update category
  updateCategory: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    type: Joi.string().valid('expense', 'income').optional(),
    description: Joi.string().max(500).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    icon: Joi.string().max(50).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

module.exports = {
  validate,
  commonSchemas,
  userSchemas,
  walletSchemas,
  transactionSchemas,
  labelSchemas,
  categorySchemas
};
