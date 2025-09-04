const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class TransactionController {
  constructor() {
    this.transactionModel = Transaction;
    this.walletModel = Wallet;
  }

  // Get user transactions
  async getUserTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const {
        page = 1,
        limit = 10,
        walletId = null,
        type = null,
        category = null,
        labels = null,
        startDate = null,
        endDate = null,
        minAmount = null,
        maxAmount = null,
        status = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        walletId,
        type,
        category,
        labels: labels ? labels.split(',') : null,
        startDate,
        endDate,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        status,
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByUserId(userId, options);

      return ApiResponse.success(res, 'Transactions retrieved successfully', {
        transactions: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting user transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions');
    }
  }

  // Get transaction statistics
  async getTransactionStats(req, res) {
    try {
      const userId = req.user.userId;
      const {
        startDate = null,
        endDate = null,
        walletId = null,
        type = null,
        category = null
      } = req.query;

      const options = {
        startDate,
        endDate,
        walletId,
        type,
        category
      };

      const stats = await this.transactionModel.getStats(userId, options);

      return ApiResponse.success(res, 'Transaction statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Error getting transaction stats:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transaction statistics');
    }
  }

  // Get transactions by category
  async getTransactionsByCategory(req, res) {
    try {
      const userId = req.user.userId;
      const { category } = req.params;
      const {
        page = 1,
        limit = 10,
        type = null,
        startDate = null,
        endDate = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        startDate,
        endDate,
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByCategory(userId, category, options);

      return ApiResponse.success(res, `Transactions for category "${category}" retrieved successfully`, {
        transactions: result.transactions,
        pagination: result.pagination,
        category
      });
    } catch (error) {
      logger.error('Error getting transactions by category:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions by category');
    }
  }

  // Get transactions by type
  async getTransactionsByType(req, res) {
    try {
      const userId = req.user.userId;
      const { type } = req.params;
      const {
        page = 1,
        limit = 10,
        startDate = null,
        endDate = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate,
        endDate,
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByType(userId, type, options);

      return ApiResponse.success(res, `${type} transactions retrieved successfully`, {
        transactions: result.transactions,
        pagination: result.pagination,
        type
      });
    } catch (error) {
      logger.error('Error getting transactions by type:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions by type');
    }
  }

  // Get transactions by label
  async getTransactionsByLabel(req, res) {
    try {
      const userId = req.user.userId;
      const { labelId } = req.params;
      const {
        page = 1,
        limit = 10,
        startDate = null,
        endDate = null,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate,
        endDate,
        sortBy,
        sortOrder
      };

      const result = await this.transactionModel.findByLabelId(userId, labelId, options);

      return ApiResponse.success(res, `Transactions for label retrieved successfully`, {
        transactions: result.transactions,
        pagination: result.pagination,
        labelId
      });
    } catch (error) {
      logger.error('Error getting transactions by label:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve transactions by label');
    }
  }

  // Get recent transactions
  async getRecentTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      const transactions = await this.transactionModel.getRecentTransactions(userId, parseInt(limit));

      return ApiResponse.success(res, 'Recent transactions retrieved successfully', {
        transactions
      });
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      return ApiResponse.internalServerError(res, 'Failed to retrieve recent transactions');
    }
  }

  // Get transaction by ID
  async getTransactionById(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;

      const transaction = await this.transactionModel.findByIdAndUserId(transactionId, userId);
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
      const userId = req.user.userId;
      const transactionData = { ...req.body, userId };

      // Validate wallet belongs to user
      const wallet = await this.walletModel.findByIdAndUserId(transactionData.walletId, userId);
      if (!wallet) {
        return ApiResponse.notFound(res, 'Wallet not found');
      }

      // Handle different transaction types
      if (transactionData.type === 'transfer') {
        // Validate transfer wallets
        if (!transactionData.fromWalletId || !transactionData.toWalletId) {
          return ApiResponse.badRequest(res, 'Transfer requires both fromWalletId and toWalletId');
        }
        
        if (transactionData.fromWalletId === transactionData.toWalletId) {
          return ApiResponse.badRequest(res, 'Cannot transfer to the same wallet');
        }

        // Check if source wallet has sufficient balance
        const hasBalance = await this.walletModel.hasSufficientBalance(transactionData.fromWalletId, transactionData.amount);
        if (!hasBalance) {
          return ApiResponse.badRequest(res, 'Insufficient balance in source wallet');
        }

        // Validate both wallets belong to user
        const fromWallet = await this.walletModel.findByIdAndUserId(transactionData.fromWalletId, userId);
        const toWallet = await this.walletModel.findByIdAndUserId(transactionData.toWalletId, userId);
        
        if (!fromWallet || !toWallet) {
          return ApiResponse.notFound(res, 'One or both wallets not found');
        }
      } else if (transactionData.type === 'expense' && transactionData.amount > 0) {
        const hasBalance = await this.walletModel.hasSufficientBalance(transactionData.walletId, transactionData.amount);
        if (!hasBalance) {
          return ApiResponse.badRequest(res, 'Insufficient balance in wallet');
        }
      }

      const transaction = await this.transactionModel.create(transactionData);

      // Update wallet balance based on transaction type
      if (transactionData.type === 'income') {
        await this.walletModel.addIncome(transactionData.walletId, transactionData.amount);
      } else if (transactionData.type === 'expense') {
        await this.walletModel.addExpense(transactionData.walletId, transactionData.amount);
      } else if (transactionData.type === 'transfer') {
        // Transfer between wallets
        await this.walletModel.transferBetweenWallets(
          transactionData.fromWalletId,
          transactionData.toWalletId,
          transactionData.amount
        );
      }

      return ApiResponse.created(res, 'Transaction created successfully', { transaction });
    } catch (error) {
      logger.error('Error creating transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to create transaction');
    }
  }

  // Update transaction
  async updateTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;

      const transaction = await this.transactionModel.findByIdAndUserId(transactionId, userId);
      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      // If amount or type is being updated, handle wallet balance changes
      if ((updateData.amount !== undefined && updateData.amount !== transaction.amount) ||
          (updateData.type !== undefined && updateData.type !== transaction.type)) {
        
        const oldAmount = transaction.amount;
        const oldType = transaction.type;
        const newAmount = updateData.amount !== undefined ? updateData.amount : oldAmount;
        const newType = updateData.type !== undefined ? updateData.type : oldType;

        // Revert old transaction effect
        if (oldType === 'income') {
          await this.walletModel.addExpense(transaction.walletId, oldAmount);
        } else if (oldType === 'expense') {
          await this.walletModel.addIncome(transaction.walletId, oldAmount);
        }

        // Apply new transaction effect
        if (newType === 'income') {
          await this.walletModel.addIncome(transaction.walletId, newAmount);
        } else if (newType === 'expense') {
          const hasBalance = await this.walletModel.hasSufficientBalance(transaction.walletId, newAmount);
          if (!hasBalance) {
            return ApiResponse.badRequest(res, 'Insufficient balance in wallet');
          }
          await this.walletModel.addExpense(transaction.walletId, newAmount);
        }
      }

      const success = await this.transactionModel.updateById(transactionId, updateData);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to update transaction');
      }

      const updatedTransaction = await this.transactionModel.findById(transactionId);

      return ApiResponse.success(res, 'Transaction updated successfully', { transaction: updatedTransaction });
    } catch (error) {
      logger.error('Error updating transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to update transaction');
    }
  }

  // Delete transaction
  async deleteTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;

      const transaction = await this.transactionModel.findByIdAndUserId(transactionId, userId);
      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      // Revert wallet balance changes
      if (transaction.type === 'income') {
        await this.walletModel.addExpense(transaction.walletId, transaction.amount);
      } else if (transaction.type === 'expense') {
        await this.walletModel.addIncome(transaction.walletId, transaction.amount);
      }

      const success = await this.transactionModel.deleteById(transactionId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to delete transaction');
      }

      return ApiResponse.success(res, 'Transaction deleted successfully');
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to delete transaction');
    }
  }

  // Add label to transaction
  async addLabelToTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;
      const { labelId } = req.body;

      const transaction = await this.transactionModel.findByIdAndUserId(transactionId, userId);
      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      const success = await this.transactionModel.addLabel(transactionId, labelId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to add label to transaction');
      }

      return ApiResponse.success(res, 'Label added to transaction successfully');
    } catch (error) {
      logger.error('Error adding label to transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to add label to transaction');
    }
  }

  // Remove label from transaction
  async removeLabelFromTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;
      const { labelId } = req.body;

      const transaction = await this.transactionModel.findByIdAndUserId(transactionId, userId);
      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      const success = await this.transactionModel.removeLabel(transactionId, labelId);
      if (!success) {
        return ApiResponse.internalServerError(res, 'Failed to remove label from transaction');
      }

      return ApiResponse.success(res, 'Label removed from transaction successfully');
    } catch (error) {
      logger.error('Error removing label from transaction:', error);
      return ApiResponse.internalServerError(res, 'Failed to remove label from transaction');
    }
  }

}

module.exports = new TransactionController();
