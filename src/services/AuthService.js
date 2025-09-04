const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Label = require('../models/Label');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.userModel = User;
    this.walletModel = Wallet;
    this.labelModel = Label;
  }

  // User registration
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create user
      const user = await this.userModel.create(userData);
      
      // Create default wallet for user
      const defaultWallet = await this.walletModel.create({
        userId: user._id.toString(),
        name: 'Main Wallet',
        balance: 0,
        currency: 'VND',
        description: 'Your primary wallet for daily expenses',
        color: '#3B82F6',
        icon: 'wallet'
      });

      // Create default labels for user
      await this.labelModel.createDefaultLabels(user._id.toString());

      logger.info(`User registered successfully: ${user.email}`);
      
      return {
        user,
        defaultWallet,
        message: 'User registered successfully'
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  // User login
  async login(email, password) {
    try {
      // Find user by email
      const user = await this.userModel.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Check if account is locked
      const isLocked = await this.userModel.isLocked(user._id.toString());
      if (isLocked) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      // Verify password
      const isPasswordValid = await this.userModel.comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Update login attempts
        await this.userModel.updateLoginAttempts(user._id.toString(), false);
        throw new Error('Invalid email or password');
      }

      // Reset login attempts on successful login
      await this.userModel.updateLoginAttempts(user._id.toString(), true);

      // Generate tokens
      const accessToken = this.userModel.generateToken(user._id.toString(), 'access');
      const refreshToken = this.userModel.generateToken(user._id.toString(), 'refresh');

      logger.info(`User logged in successfully: ${user.email}`);
      
      return {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          preferences: user.preferences
        },
        accessToken,
        refreshToken,
        message: 'Login successful'
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = require('jsonwebtoken').verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user
      const user = await this.userModel.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = this.userModel.generateToken(user._id.toString(), 'access');
      const newRefreshToken = this.userModel.generateToken(user._id.toString(), 'refresh');

      logger.info(`Token refreshed for user: ${user.email}`);
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password
      const user = await this.userModel.findByEmail(
        (await this.userModel.findById(userId)).email
      );
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.userModel.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const bcrypt = require('bcryptjs');
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.userModel.updateById(userId, {
        password: hashedNewPassword,
        passwordChangedAt: new Date()
      });

      logger.info(`Password changed for user: ${user.email}`);
      
      return {
        message: 'Password changed successfully'
      };
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }


  // Logout
  async logout(userId) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just log the logout
      const user = await this.userModel.findById(userId);
      if (user) {
        logger.info(`User logged out: ${user.email}`);
      }
      
      return {
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        user,
        message: 'Profile retrieved successfully'
      };
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      // Remove sensitive fields from update data
      const { password, email, role, ...safeUpdateData } = updateData;

      const success = await this.userModel.updateById(userId, safeUpdateData);
      if (!success) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await this.userModel.findById(userId);
      
      logger.info(`Profile updated for user: ${updatedUser.email}`);
      
      return {
        user: updatedUser,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

}

module.exports = new AuthService();
