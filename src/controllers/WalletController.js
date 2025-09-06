const Wallet = require('../models/Wallet');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class WalletController {
  constructor() {
    this.walletModel = new Wallet();
  }

  // Get user wallets
  async getUserWallets(req, res) {
    try {
      const userId = req.user._id;
      const {
        page = 1,
        limit = 10,
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        isActive: isActive === null ? null : isActive === 'true',
        sortBy,
        sortOrder
      };

      const result = await this.walletModel.findByUserId(userId, options);

      return ApiResponse.success(res, 'Wallets retrieved successfully', {
        wallets: result.wallets,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting user wallets:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve wallets');
    }
  }

  // Get wallet statistics
  async getWalletStats(req, res) {
    try {
      const userId = req.user._id;
      const stats = await this.walletModel.getStats(userId);

      return ApiResponse.success(res, 'Wallet statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Error getting wallet stats:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve wallet statistics');
    }
  }

  // Get wallet by ID
  async getWalletById(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user._id;

      const wallet = await this.walletModel.findByIdAndUserId(walletId, userId);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      return ApiResponse.success(res, 'Wallet retrieved successfully', { wallet });
    } catch (error) {
      logger.error('Error getting wallet by ID:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve wallet');
    }
  }

  // Create new wallet
  async createWallet(req, res) {
    try {
      const userId = req.user._id;
      const walletData = { ...req.body, userId };

      const wallet = await this.walletModel.create(walletData);

      return ApiResponse.created(res, 'Wallet created successfully', { wallet });
    } catch (error) {
      logger.error('Error creating wallet:', error);
      if (error.code === 11000) {
        return ApiResponse.conflict(res, 'Wallet name already exists for this user');
      }
      return ApiResponse.internalServerError(res, 'Failed to create wallet');
    }
  }

  // Update wallet
  async updateWallet(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user._id;
      const updateData = req.body;

      const wallet = await this.walletModel.findByIdAndUserId(walletId, userId);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const success = await this.walletModel.updateById(walletId, updateData);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to update wallet');
      }

      const updatedWallet = await this.walletModel.findById(walletId);

      return ApiResponse.success(res, 'Wallet updated successfully', { wallet: updatedWallet });
    } catch (error) {
      logger.error('Error updating wallet:', error);
      return ApiResponse.internalServerError(res, 'Failed to update wallet');
    }
  }

  // Delete wallet
  async deleteWallet(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user._id;

      const wallet = await this.walletModel.findByIdAndUserId(walletId, userId);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      if (wallet.isDefault) {
        return ApiResponse.badRequest(res, 'Cannot delete default wallet');
      }

      const success = await this.walletModel.deleteById(walletId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to delete wallet');
      }

      return ApiResponse.success(res, 'Wallet deleted successfully');
    } catch (error) {
      logger.error('Error deleting wallet:', error);
      return ApiResponse.internalServerError(res, 'Failed to delete wallet');
    }
  }

  // Set default wallet
  async setDefaultWallet(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user._id;

      const wallet = await this.walletModel.findByIdAndUserId(walletId, userId);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const success = await this.walletModel.setDefaultWallet(walletId, userId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to set default wallet');
      }

      return ApiResponse.success(res, 'Default wallet set successfully');
    } catch (error) {
      logger.error('Error setting default wallet:', error);
      return ApiResponse.internalServerError(res, 'Failed to set default wallet');
    }
  }

  // Transfer between wallets
  async transferBetweenWallets(req, res) {
    try {
      const userId = req.user._id;
      const { fromWalletId, toWalletId, amount, description } = req.body;

      // Validate wallets belong to user
      const fromWallet = await this.walletModel.findByIdAndUserId(fromWalletId, userId);
      const toWallet = await this.walletModel.findByIdAndUserId(toWalletId, userId);

      if (!fromWallet || !toWallet) {
        return ApiResponse.notFound(res, 'One or both wallets not found');
      }

      if (fromWalletId === toWalletId) {
        return ApiResponse.badRequest(res, 'Cannot transfer to the same wallet');
      }

      if (amount <= 0) {
        return ApiResponse.badRequest(res, 'Transfer amount must be positive');
      }

      // Check if source wallet has sufficient balance
      const hasBalance = await this.walletModel.hasSufficientBalance(fromWalletId, amount);
      if (!hasBalance) {
        return ApiResponse.badRequest(res, 'Insufficient balance in source wallet');
      }

      const success = await this.walletModel.transferBetweenWallets(fromWalletId, toWalletId, amount);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to complete transfer');
      }

      return ApiResponse.success(res, 'Transfer completed successfully', {
        fromWalletId,
        toWalletId,
        amount,
        description
      });
    } catch (error) {
      logger.error('Error transferring between wallets:', error);
      return ApiResponse.internalServerError(res, 'Failed to complete transfer');
    }
  }
}

module.exports = WalletController;
