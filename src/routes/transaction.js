const express = require('express');
const router = express.Router();

const TransactionController = require('../controllers/TransactionController');
const transactionController = new TransactionController();
const { validate, transactionSchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Transaction Management
 *   description: Transaction management endpoints for users
 */

// All routes require authentication
router.use(authenticate);

// ===== WALLET-SPECIFIC TRANSACTION ROUTES =====

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}:
 *   get:
 *     summary: Get wallet transactions
 *     description: Retrieve all transactions for a specific wallet with pagination and filtering options
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Wallet ID (MongoDB ObjectId)
 *         example: "68bbbc404606cf90aa200983"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of transactions per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description and receiver fields
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Start date filter (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: End date filter (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum amount filter
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *           length: 3
 *         description: Currency filter (3-letter code)
 *         example: "VND"
 *       - in: query
 *         name: labels
 *         schema:
 *           type: string
 *         description: Comma-separated label IDs
 *         example: "68bbf9b753ad1d9538dccd41,68bbf9b753ad1d9538dccd42"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, amount, description]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */
router.get('/wallet/:walletId', requireUserOrAdmin, (req, res) => transactionController.getWalletTransactions(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}:
 *   post:
 *     summary: Create new transaction
 *     description: Create a new transaction for a specific wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Wallet ID (MongoDB ObjectId)
 *         example: "68bbbc404606cf90aa200983"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransactionRequest'
 *           examples:
 *             example1:
 *               summary: Basic transaction
 *               value:
 *                 amount: 100000
 *                 currency: "VND"
 *                 description: "Grocery shopping"
 *                 receiver: "Supermarket ABC"
 *                 labels: ["68bbf9b753ad1d9538dccd41"]
 *             example2:
 *               summary: Transaction with receipt
 *               value:
 *                 amount: 50000
 *                 currency: "VND"
 *                 description: "Coffee"
 *                 receiver: "Coffee Shop"
 *                 receipt: "receipt_image_url"
 *                 labels: ["68bbf9b753ad1d9538dccd42"]
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */
router.post('/wallet/:walletId', requireUserOrAdmin, validate(transactionSchemas.createTransaction), (req, res) => transactionController.createTransaction(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/stats:
 *   get:
 *     summary: Get transaction statistics for wallet
 *     description: Retrieve statistical data for transactions in a specific wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Wallet ID (MongoDB ObjectId)
 *         example: "68bbbc404606cf90aa200983"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Start date filter (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: End date filter (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *           length: 3
 *         description: Currency filter (3-letter code)
 *         example: "VND"
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */
router.get('/wallet/:walletId/stats', requireUserOrAdmin, (req, res) => transactionController.getTransactionStats(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/recent:
 *   get:
 *     summary: Get recent transactions for wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of recent transactions
 *     responses:
 *       200:
 *         description: Recent transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/wallet/:walletId/recent', requireUserOrAdmin, (req, res) => transactionController.getRecentTransactions(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/search:
 *   get:
 *     summary: Search transactions in wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/wallet/:walletId/search', requireUserOrAdmin, (req, res) => transactionController.searchTransactions(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/date-range:
 *   get:
 *     summary: Get transactions by date range for wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/wallet/:walletId/date-range', requireUserOrAdmin, (req, res) => transactionController.getTransactionsByDateRange(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/labels:
 *   get:
 *     summary: Get transactions by labels for wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *       - in: query
 *         name: labels
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated label IDs
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/wallet/:walletId/labels', requireUserOrAdmin, (req, res) => transactionController.getTransactionsByLabels(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/bulk-update:
 *   put:
 *     summary: Bulk update transactions in wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateTransactionsRequest'
 *     responses:
 *       200:
 *         description: Transactions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.put('/wallet/:walletId/bulk-update', requireUserOrAdmin, validate(transactionSchemas.bulkUpdateTransactions), (req, res) => transactionController.bulkUpdateTransactions(req, res));

/**
 * @swagger
 * /api/v1/transactions/wallet/{walletId}/bulk-delete:
 *   delete:
 *     summary: Bulk delete transactions in wallet
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkDeleteTransactionsRequest'
 *     responses:
 *       200:
 *         description: Transactions deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.delete('/wallet/:walletId/bulk-delete', requireUserOrAdmin, validate(transactionSchemas.bulkDeleteTransactions), (req, res) => transactionController.bulkDeleteTransactions(req, res));

// ===== GENERAL TRANSACTION ROUTES =====

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     description: Retrieve a specific transaction by its ID (requires walletId for security)
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Transaction ID (MongoDB ObjectId)
 *         example: "68bbbc404606cf90aa200984"
 *       - in: query
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Wallet ID (MongoDB ObjectId) - Required for security verification
 *         example: "68bbbc404606cf90aa200983"
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Transaction or wallet not found
 *       500:
 *         description: Internal server error
 */
router.get('/:transactionId', requireUserOrAdmin, (req, res) => transactionController.getTransactionById(req, res));

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   put:
 *     summary: Update transaction
 *     description: Update a specific transaction by its ID (requires walletId for security)
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Transaction ID (MongoDB ObjectId)
 *         example: "68bbbc404606cf90aa200984"
 *       - in: query
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Wallet ID (MongoDB ObjectId) - Required for security verification
 *         example: "68bbbc404606cf90aa200983"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTransactionRequest'
 *           examples:
 *             example1:
 *               summary: Update amount and description
 *               value:
 *                 amount: 150000
 *                 description: "Updated grocery shopping"
 *             example2:
 *               summary: Update labels
 *               value:
 *                 labels: ["68bbf9b753ad1d9538dccd41", "68bbf9b753ad1d9538dccd43"]
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Transaction or wallet not found
 *       500:
 *         description: Internal server error
 */
router.put('/:transactionId', requireUserOrAdmin, validate(transactionSchemas.updateTransaction), (req, res) => transactionController.updateTransaction(req, res));

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   delete:
 *     summary: Delete transaction (soft delete)
 *     description: Soft delete a specific transaction by its ID (requires walletId for security)
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Transaction ID (MongoDB ObjectId)
 *         example: "68bbbc404606cf90aa200984"
 *       - in: query
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Wallet ID (MongoDB ObjectId) - Required for security verification
 *         example: "68bbbc404606cf90aa200983"
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Transaction or wallet not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:transactionId', requireUserOrAdmin, (req, res) => transactionController.deleteTransaction(req, res));

module.exports = router;