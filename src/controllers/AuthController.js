const AuthService = require('../services/AuthService');
const authService = new AuthService();
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  /**
   * User registration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      
      logger.info(`User registration successful: ${result.user.email}`);
      
      return ApiResponse.created(res, 'User registered successfully', {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      logger.error('User registration failed:', error);
      
      if (error.message.includes('already exists')) {
        return ApiResponse.conflict(res, error.message);
      }
      
      return ApiResponse.badRequest(res, error.message);
    }
  }

  /**
   * User login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      logger.info(`User login successful: ${result.user.email}`);
      
      return ApiResponse.success(res, 'Login successful', {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      logger.error('User login failed:', error);
      
      if (error.message.includes('Invalid email or password')) {
        return ApiResponse.unauthorized(res, 'Invalid email or password');
      }
      
      if (error.message.includes('Account is deactivated')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      if (error.message.includes('Account is temporarily locked')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      return ApiResponse.badRequest(res, error.message);
    }
  }

  /**
   * Refresh access token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return ApiResponse.badRequest(res, 'Refresh token is required');
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      logger.info(`Token refreshed successfully for user: ${result.user.email}`);
      
      return ApiResponse.success(res, 'Token refreshed successfully', {
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);
      
      if (error.message.includes('User not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('Account is deactivated')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      if (error.message.includes('Password changed')) {
        return ApiResponse.unauthorized(res, error.message);
      }
      
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }
  }


  /**
   * User logout
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      await authService.logout(req.user._id);
      
      logger.info(`User logged out: ${req.user.email}`);
      
      return ApiResponse.success(res, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout failed:', error);
      return ApiResponse.internalServerError(res, 'Logout failed', error);
    }
  }

  /**
   * Get user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const profile = await authService.getProfile(req.user._id);
      
      return ApiResponse.success(res, 'Profile retrieved successfully', profile);
    } catch (error) {
      logger.error('Get profile failed:', error);
      
      if (error.message.includes('User not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.internalServerError(res, 'Failed to get profile', error);
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const updatedProfile = await authService.updateProfile(req.user._id, req.body);
      
      logger.info(`Profile updated for user: ${req.user.email}`);
      
      return ApiResponse.success(res, 'Profile updated successfully', updatedProfile);
    } catch (error) {
      logger.error('Profile update failed:', error);
      
      if (error.message.includes('User not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.badRequest(res, error.message);
    }
  }

  /**
   * Change password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (newPassword !== confirmPassword) {
        return ApiResponse.badRequest(res, 'New password and confirm password do not match');
      }
      
      await authService.changePassword(req.user._id, currentPassword, newPassword);
      
      logger.info(`Password changed for user: ${req.user.email}`);
      
      return ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      logger.error('Password change failed:', error);
      
      if (error.message.includes('User not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('Current password is incorrect')) {
        return ApiResponse.badRequest(res, error.message);
      }
      
      return ApiResponse.badRequest(res, error.message);
    }
  }
}

module.exports = AuthController;
