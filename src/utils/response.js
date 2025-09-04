/**
 * Standardized API Response Utility
 * Provides consistent response format for all API endpoints
 */

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {*} data - Response data
   * @param {Object} meta - Additional metadata (pagination, etc.)
   */
  static success(res, message = 'Success', data = null, meta = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null) {
      response.data = data;
    }

    if (meta !== null) {
      response.meta = meta;
    }

    return res.status(200).json(response);
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {*} errors - Error details
   * @param {string} code - Error code for client handling
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null, code = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors !== null) {
      response.errors = errors;
    }

    if (code !== null) {
      response.code = code;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {*} data - Created resource data
   */
  static created(res, message = 'Resource created successfully', data = null) {
    return this.success(res, 201, message, data);
  }

  /**
   * No content response (204)
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad request response (400)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {*} errors - Validation errors
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, 400, message, errors, 'BAD_REQUEST');
  }

  /**
   * Unauthorized response (401)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, 401, message, null, 'UNAUTHORIZED');
  }

  /**
   * Forbidden response (403)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, 403, message, null, 'FORBIDDEN');
  }

  /**
   * Not found response (404)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, 404, message, null, 'NOT_FOUND');
  }

  /**
   * Conflict response (409)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, 409, message, null, 'CONFLICT');
  }

  /**
   * Unprocessable entity response (422)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {*} errors - Validation errors
   */
  static unprocessableEntity(res, message = 'Unprocessable Entity', errors = null) {
    return this.error(res, 422, message, errors, 'UNPROCESSABLE_ENTITY');
  }

  /**
   * Internal server error response (500)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Error} error - Error object for logging
   */
  static internalServerError(res, message = 'Internal Server Error', error = null) {
    // Log the error for debugging
    if (error) {
      console.error('Internal Server Error:', error);
    }
    
    return this.error(res, 500, message, null, 'INTERNAL_SERVER_ERROR');
  }

  /**
   * Pagination metadata helper
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items
   * @returns {Object} Pagination metadata
   */
  static paginationMeta(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

module.exports = ApiResponse;
