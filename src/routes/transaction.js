const express = require('express');
const router = express.Router();

const TransactionController = require('../controllers/TransactionController');
const transactionController = new TransactionController();
const { validate, transactionSchemas, commonSchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Transaction Management
 *   description: Transaction management endpoints for users
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions:
 *   get:
 *     summary: Get wallet transactions
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
 *         description: Number of transactions per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description and receiver
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           length: 3
 *         description: Currency filter
 *       - in: query
 *         name: labels
 *         schema:
 *           type: string
 *         description: Comma-separated label IDs
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/:walletId/transactions', requireUserOrAdmin, transactionController.getWalletTransactions);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *       - in: query
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Wallet ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction or wallet not found
 */
router.get('/:transactionId', requireUserOrAdmin, transactionController.getTransactionById);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions:
 *   post:
 *     summary: Create a new transaction
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
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Transaction amount
 *               currency:
 *                 type: string
 *                 length: 3
 *                 default: VND
 *                 description: Currency code
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Transaction description
 *               receipt:
 *                 type: string
 *                 format: uri
 *                 description: Receipt URL
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: Array of label IDs
 *               receiver:
 *                 type: string
 *                 maxLength: 200
 *                 description: Receiver name
 *     responses:
 *       201:
 *         description: Transaction created successfully
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
router.post('/:walletId/transactions', requireUserOrAdmin, validate(transactionSchemas.createTransaction), transactionController.createTransaction);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   put:
 *     summary: Update transaction
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *       - in: query
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
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Transaction amount
 *               currency:
 *                 type: string
 *                 length: 3
 *                 description: Currency code
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Transaction description
 *               receipt:
 *                 type: string
 *                 format: uri
 *                 description: Receipt URL
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: Array of label IDs
 *               receiver:
 *                 type: string
 *                 maxLength: 200
 *                 description: Receiver name
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction or wallet not found
 */
router.put('/:transactionId', requireUserOrAdmin, validate(transactionSchemas.updateTransaction), transactionController.updateTransaction);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   delete:
 *     summary: Delete transaction
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *       - in: query
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Wallet ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction or wallet not found
 */
router.delete('/:transactionId', requireUserOrAdmin, transactionController.deleteTransaction);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/stats:
 *   get:
 *     summary: Get transaction statistics
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
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           length: 3
 *         description: Currency filter
 *     responses:
 *       200:
 *         description: Transaction statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/:walletId/transactions/stats', requireUserOrAdmin, transactionController.getTransactionStats);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/recent:
 *   get:
 *     summary: Get recent transactions
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
 *           default: 10
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
router.get('/:walletId/transactions/recent', requireUserOrAdmin, transactionController.getRecentTransactions);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/search:
 *   get:
 *     summary: Search transactions
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
 *         name: query
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
 *         description: Number of transactions per page
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
 *         description: Transaction search completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Search query is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/:walletId/transactions/search', requireUserOrAdmin, transactionController.searchTransactions);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/date-range:
 *   get:
 *     summary: Get transactions by date range
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
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
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
 *         description: Number of transactions per page
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
 *         description: Transactions by date range retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Start date and end date are required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/:walletId/transactions/date-range', requireUserOrAdmin, transactionController.getTransactionsByDateRange);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/labels:
 *   get:
 *     summary: Get transactions by labels
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
 *         description: Number of transactions per page
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
 *         description: Transactions by labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Labels are required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/:walletId/transactions/labels', requireUserOrAdmin, transactionController.getTransactionsByLabels);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/bulk-update:
 *   put:
 *     summary: Bulk update transactions
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
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       description: Transaction ID
 *                     data:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           format: float
 *                         currency:
 *                           type: string
 *                           length: 3
 *                         description:
 *                           type: string
 *                           maxLength: 500
 *                         receipt:
 *                           type: string
 *                           format: uri
 *                         labels:
 *                           type: array
 *                           items:
 *                             type: string
 *                         receiver:
 *                           type: string
 *                           maxLength: 200
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
router.put('/:walletId/transactions/bulk-update', requireUserOrAdmin, validate(transactionSchemas.bulkUpdateTransactions), transactionController.bulkUpdateTransactions);

/**
 * @swagger
 * /api/v1/wallets/{walletId}/transactions/bulk-delete:
 *   delete:
 *     summary: Bulk delete transactions
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
 *             type: object
 *             properties:
 *               transactionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of transaction IDs
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
router.delete('/:walletId/transactions/bulk-delete', requireUserOrAdmin, validate(transactionSchemas.bulkDeleteTransactions), transactionController.bulkDeleteTransactions);

module.exports = router;