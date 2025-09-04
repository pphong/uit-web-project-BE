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
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
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
    walletId: commonSchemas.objectId,
    type: Joi.string().valid('income', 'expense', 'transfer').required(),
    amount: Joi.number().precision(2).positive().required(),
    currency: Joi.string().length(3).uppercase().default('VND'),
    description: Joi.string().max(500).required(),
    category: Joi.string().min(1).max(100).required(),
    labels: Joi.array().items(commonSchemas.objectId).max(10).optional(),
    date: Joi.date().max('now').default('now'),
    notes: Joi.string().max(1000).optional(),
    status: Joi.string().valid('pending', 'completed', 'cancelled').default('completed'),
    // Transfer specific fields
    fromWalletId: commonSchemas.objectId.when('type', {
      is: 'transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    fromBudgetId: commonSchemas.objectId.optional(),
    toWalletId: commonSchemas.objectId.when('type', {
      is: 'transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  }),

  // Update transaction
  updateTransaction: Joi.object({
    type: Joi.string().valid('income', 'expense', 'transfer').optional(),
    amount: Joi.number().precision(2).positive().optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().min(1).max(100).optional(),
    labels: Joi.array().items(commonSchemas.objectId).max(10).optional(),
    date: Joi.date().max('now').optional(),
    notes: Joi.string().max(1000).optional(),
    status: Joi.string().valid('pending', 'completed', 'cancelled').optional(),
    // Transfer specific fields
    fromWalletId: commonSchemas.objectId.optional(),
    fromBudgetId: commonSchemas.objectId.optional(),
    toWalletId: commonSchemas.objectId.optional(),
  }),

  // Transaction filters
  transactionFilters: Joi.object({
    walletId: commonSchemas.objectId.optional(),
    type: Joi.string().valid('income', 'expense', 'transfer').optional(),
    category: Joi.string().optional(),
    labels: Joi.array().items(commonSchemas.objectId).optional(),
    minAmount: Joi.number().precision(2).min(0).optional(),
    maxAmount: Joi.number().precision(2).min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    status: Joi.string().valid('pending', 'completed', 'cancelled').optional(),
  }).concat(commonSchemas.pagination),
};

/**
 * Budget and alert validation schemas
 */
const budgetSchemas = {
  // Create budget
  createBudget: Joi.object({
    walletId: commonSchemas.objectId,
    name: Joi.string().min(1).max(100).required(),
    amount: Joi.number().precision(2).positive().required(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    categories: Joi.array().items(Joi.string()).optional(),
    labels: Joi.array().items(Joi.string()).optional(),
    description: Joi.string().max(500).optional(),
  }),

  // Create alert
  createAlert: Joi.object({
    walletId: commonSchemas.objectId,
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('expense_limit', 'budget_remaining', 'no_expense').required(),
    threshold: Joi.number().precision(2).positive().required(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
    isActive: Joi.boolean().default(true),
    description: Joi.string().max(500).optional(),
  }),
};

/**
 * Label validation schemas
 */
const labelSchemas = {
  // Create label
  createLabel: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    description: Joi.string().max(200).optional(),
  }),

  // Update label
  updateLabel: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    description: Joi.string().max(200).optional(),
  }),
};

module.exports = {
  validate,
  commonSchemas,
  userSchemas,
  walletSchemas,
  transactionSchemas,
  budgetSchemas,
  labelSchemas,
};
