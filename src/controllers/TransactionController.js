const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class TransactionController {
  constructor() {
    this.transactionModel = new Transaction();
    this.walletModel = new Wallet();
  }

  // Get wallet transactions
  async getWalletTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const {
        page = 1,
        limit = 10,
        search = '',
        startDate = null,
        endDate = null,
        minAmount = null,
        maxAmount = null,
        currency = null,
        labels = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        startDate,
        endDate,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        currency,
        labels: labels ? labels.split(',').map(id => id.trim()) : [],
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByWalletId(walletId, options);

      return ApiResponse.success(res, 'Transactions retrieved successfully', {
        transactions: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting wallet transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions');
    }
  }

  // Get transaction by ID
  async getTransactionById(req, res) {
    try {
      const { transactionId } = req.params;
      const { walletId } = req.query;

      if (!walletId) {
        return ApiResponse.badRequest(res, 'Wallet ID is required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const transaction = await this.transactionModel.findByIdAndWalletId(transactionId, walletId);
      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      return ApiResponse.success(res, 'Transaction retrieved successfully', { transaction });
    } catch (error) {
      logger.error('Error getting transaction by ID:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transaction');
    }
  }

  // Create new transaction
  async createTransaction(req, res) {
    try {
      const { walletId } = req.params;
      const transactionData = { ...req.body, walletId };

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      // Validate required fields
      if (!transactionData.amount || transactionData.amount <= 0) {
        return ApiResponse.badRequest(res, 'Amount must be greater than 0');
      }

      if (!transactionData.description || transactionData.description.trim() === '') {
        return ApiResponse.badRequest(res, 'Description is required');
      }

      // Create transaction
      const transaction = await this.transactionModel.create(transactionData);

      // Update wallet with new transaction
      await this.walletModel.updateWalletForNewTransaction(walletId, transaction);

      return ApiResponse.created(res, 'Transaction created successfully', { 
        transaction,
        message: 'Wallet balance and latest transaction updated'
      });
    } catch (error) {
      logger.error('Error creating transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to create transaction');
    }
  }

  // Update transaction
  async updateTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const { walletId } = req.query;
      const updateData = req.body;

      if (!walletId) {
        return ApiResponse.badRequest(res, 'Wallet ID is required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const oldTransaction = await this.transactionModel.findByIdAndWalletId(transactionId, walletId);
      if (!oldTransaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      // Validate amount if provided
      if (updateData.amount !== undefined && updateData.amount <= 0) {
        return ApiResponse.badRequest(res, 'Amount must be greater than 0');
      }

      // Update transaction
      const success = await this.transactionModel.updateById(transactionId, updateData);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to update transaction');
      }

      const updatedTransaction = await this.transactionModel.findById(transactionId);

      // Update wallet if amount changed
      if (updateData.amount !== undefined && updateData.amount !== oldTransaction.amount) {
        await this.walletModel.updateWalletForTransactionUpdate(walletId, oldTransaction, updatedTransaction);
      }

      return ApiResponse.success(res, 'Transaction updated successfully', { 
        transaction: updatedTransaction,
        message: updateData.amount !== undefined && updateData.amount !== oldTransaction.amount 
          ? 'Wallet balance and latest transaction updated' 
          : 'Transaction updated'
      });
    } catch (error) {
      logger.error('Error updating transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to update transaction');
    }
  }

  // Delete transaction (soft delete)
  async deleteTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const { walletId } = req.query;

      if (!walletId) {
        return ApiResponse.badRequest(res, 'Wallet ID is required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const transaction = await this.transactionModel.findByIdAndWalletId(transactionId, walletId);
      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      // Delete transaction
      const success = await this.transactionModel.deleteById(transactionId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to delete transaction');
      }

      // Update wallet after transaction deletion
      await this.walletModel.updateWalletForTransactionDelete(walletId, transaction);

      return ApiResponse.success(res, 'Transaction deleted successfully', {
        message: 'Wallet balance and latest transaction updated'
      });
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to delete transaction');
    }
  }

  // Get transaction statistics
  async getTransactionStats(req, res) {
    try {
      const { walletId } = req.params;
      const {
        startDate = null,
        endDate = null,
        currency = null
      } = req.query;

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const options = {
        startDate,
        endDate,
        currency
      };

      const stats = await this.transactionModel.getStats(walletId, options);

      return ApiResponse.success(res, 'Transaction statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Error getting transaction stats:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transaction statistics');
    }
  }

  // Get recent transactions
  async getRecentTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { limit = 10 } = req.query;

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const transactions = await this.transactionModel.getRecent(walletId, parseInt(limit));

      return ApiResponse.success(res, 'Recent transactions retrieved successfully', { transactions });
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve recent transactions');
    }
  }

  // Search transactions
  async searchTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { query } = req.query;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      if (!query || !query.trim()) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.search(walletId, query.trim(), options);

      return ApiResponse.success(res, 'Transaction search completed', {
        transactions: result.transactions,
        pagination: result.pagination,
        searchQuery: query
      });
    } catch (error) {
      logger.error('Error searching transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to search transactions');
    }
  }

  // Get transactions by date range
  async getTransactionsByDateRange(req, res) {
    try {
      const { walletId } = req.params;
      const { startDate, endDate } = req.query;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, 'Start date and end date are required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByDateRange(walletId, startDate, endDate, options);

      return ApiResponse.success(res, 'Transactions by date range retrieved successfully', {
        transactions: result.transactions,
        pagination: result.pagination,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      logger.error('Error getting transactions by date range:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions by date range');
    }
  }

  // Get transactions by labels
  async getTransactionsByLabels(req, res) {
    try {
      const { walletId } = req.params;
      const { labels } = req.query;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      if (!labels || !labels.trim()) {
        return ApiResponse.badRequest(res, 'Labels are required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const labelIds = labels.split(',').map(id => id.trim());

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByLabels(walletId, labelIds, options);

      return ApiResponse.success(res, 'Transactions by labels retrieved successfully', {
        transactions: result.transactions,
        pagination: result.pagination,
        labels: labelIds
      });
    } catch (error) {
      logger.error('Error getting transactions by labels:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions by labels');
    }
  }

  // Bulk update transactions
  async bulkUpdateTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return ApiResponse.badRequest(res, 'Updates array is required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const modifiedCount = await this.transactionModel.bulkUpdate(walletId, updates);

      return ApiResponse.success(res, 'Transactions updated successfully', {
        modifiedCount
      });
    } catch (error) {
      logger.error('Error bulk updating transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to bulk update transactions');
    }
  }

  // Bulk delete transactions
  async bulkDeleteTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { transactionIds } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return ApiResponse.badRequest(res, 'Transaction IDs array is required');
      }

      // Verify wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(walletId, req.user._id);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      const deletedCount = await this.transactionModel.bulkDelete(walletId, transactionIds);

      return ApiResponse.success(res, 'Transactions deleted successfully', {
        deletedCount
      });
    } catch (error) {
      logger.error('Error bulk deleting transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to bulk delete transactions');
    }
  }
}

module.exports = TransactionController;