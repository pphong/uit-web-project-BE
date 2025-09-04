const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/response');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token is required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return ApiResponse.unauthorized(res, 'Access token is required');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user still exists
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return ApiResponse.unauthorized(res, 'User no longer exists');
      }

      // Check if user is active
      if (!user.isActive) {
        return ApiResponse.forbidden(res, 'User account is deactivated');
      }

      // Attach user to request object
      req.user = user;
      req.token = token;
      
      logger.info(`User authenticated: ${user.email} (ID: ${user._id})`);
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Access token has expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        return ApiResponse.unauthorized(res, 'Invalid access token');
      } else {
        logger.error('JWT verification error:', jwtError);
        return ApiResponse.unauthorized(res, 'Token verification failed');
      }
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return ApiResponse.internalServerError(res, 'Authentication failed', error);
  }
};

/**
 * Role-based Authorization Middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      if (allowedRoles.length === 0) {
        // No specific roles required, just authenticated
        return next();
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Access denied for user ${req.user.email} (role: ${req.user.role}) to ${req.method} ${req.originalUrl}`);
        return ApiResponse.forbidden(res, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return ApiResponse.internalServerError(res, 'Authorization failed', error);
    }
  };
};

/**
 * Admin-only Authorization Middleware
 */
const requireAdmin = authorize(['admin']);

/**
 * User or Admin Authorization Middleware
 */
const requireUserOrAdmin = authorize(['user', 'admin']);

/**
 * Optional Authentication Middleware
 * Similar to authenticate but doesn't fail if no token provided
 * Useful for endpoints that work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
      
      next();
    } catch (jwtError) {
      // Token is invalid, but we continue without authentication
      next();
    }
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue without authentication
  }
};

/**
 * Rate Limiting Helper for Authenticated Users
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const createUserRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const userRequestsList = userRequests.get(userId);
    
    // Remove old requests outside the window
    const validRequests = userRequestsList.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for user ${req.user.email}`);
      return ApiResponse.error(res, 429, 'Too many requests', null, 'RATE_LIMIT_EXCEEDED');
    }

    validRequests.push(now);
    userRequests.set(userId, validRequests);
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireUserOrAdmin,
  optionalAuth,
  createUserRateLimit,
};
