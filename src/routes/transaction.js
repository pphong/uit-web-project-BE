const express = require('express');
const router = express.Router();

const TransactionController = require('../controllers/TransactionController');
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
 * /api/v1/transactions:
 *   get:
 *     summary: Get user transactions
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: walletId
 *         schema:
 *           type: string
 *         description: Filter by wallet ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense, transfer]
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by transaction category
 *       - in: query
 *         name: labels
 *         schema:
 *           type: string
 *         description: Filter by labels (comma-separated)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Filter by minimum amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Filter by maximum amount
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter by transaction status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category, createdAt]
 *           default: date
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
 */
router.get('/', requireUserOrAdmin, TransactionController.getUserTransactions);

/**
 * @swagger
 * /api/v1/transactions/stats:
 *   get:
 *     summary: Get transaction statistics
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: walletId
 *         schema:
 *           type: string
 *         description: Filter by wallet ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense, transfer]
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Transaction statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', requireUserOrAdmin, TransactionController.getTransactionStats);

/**
 * @swagger
 * /api/v1/transactions/recent:
 *   get:
 *     summary: Get recent transactions
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent transactions to retrieve
 *     responses:
 *       200:
 *         description: Recent transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/recent', requireUserOrAdmin, TransactionController.getRecentTransactions);

/**
 * @swagger
 * /api/v1/transactions/type/{type}:
 *   get:
 *     summary: Get transactions by type
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [income, expense, transfer]
 *         description: Transaction type
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category, createdAt]
 *           default: date
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
 *         description: Transactions by type retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/type/:type', requireUserOrAdmin, TransactionController.getTransactionsByType);

/**
 * @swagger
 * /api/v1/transactions/category/{category}:
 *   get:
 *     summary: Get transactions by category
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction category
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense, transfer]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category, createdAt]
 *           default: date
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
 *         description: Transactions by category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/category/:category', requireUserOrAdmin, TransactionController.getTransactionsByCategory);

/**
 * @swagger
 * /api/v1/transactions/label/{labelId}:
 *   get:
 *     summary: Get transactions by label
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Label ID
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category, createdAt]
 *           default: date
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
 *         description: Transactions by label retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/label/:labelId', requireUserOrAdmin, TransactionController.getTransactionsByLabel);

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
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid transaction ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.get('/:transactionId', requireUserOrAdmin, TransactionController.getTransactionById);

/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transaction Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - category
 *               - walletId
 *               - date
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense, transfer]
 *                 description: Transaction type
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Transaction amount
 *               category:
 *                 type: string
 *                 description: Transaction category
 *               description:
 *                 type: string
 *                 description: Transaction description
 *               walletId:
 *                 type: string
 *                 description: Wallet ID for the transaction
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Transaction date
 *               status:
 *                 type: string
 *                 enum: [pending, completed, cancelled]
 *                 default: completed
 *                 description: Transaction status
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Associated label IDs
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *               currency:
 *                 type: string
 *                 length: 3
 *                 default: VND
 *                 description: Transaction currency
 *               fromWalletId:
 *                 type: string
 *                 description: Source wallet ID (required for transfer)
 *               fromBudgetId:
 *                 type: string
 *                 description: Source budget ID (optional for transfer)
 *               toWalletId:
 *                 type: string
 *                 description: Destination wallet ID (required for transfer)
 *               labelId:
 *                 type: string
 *                 description: Label ID
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
 */
router.post('/', requireUserOrAdmin, validate(transactionSchemas.createTransaction), TransactionController.createTransaction);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense, transfer]
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, completed, cancelled]
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *               currency:
 *                 type: string
 *                 length: 3
 *               fromWalletId:
 *                 type: string
 *               fromBudgetId:
 *                 type: string
 *               toWalletId:
 *                 type: string
 *               labelId:
 *                 type: string
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
 *         description: Transaction not found
 */
router.put('/:transactionId', requireUserOrAdmin, validate(transactionSchemas.updateTransaction), TransactionController.updateTransaction);

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
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid transaction ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.delete('/:transactionId', requireUserOrAdmin, TransactionController.deleteTransaction);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}/add-label:
 *   patch:
 *     summary: Add label to transaction
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - labelId
 *             properties:
 *               labelId:
 *                 type: string
 *                 description: Label ID to add
 *     responses:
 *       200:
 *         description: Label added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction or label not found
 */
router.patch('/:transactionId/add-label', requireUserOrAdmin, TransactionController.addLabelToTransaction);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}/remove-label:
 *   patch:
 *     summary: Remove label from transaction
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - labelId
 *             properties:
 *               labelId:
 *                 type: string
 *                 description: Label ID to remove
 *     responses:
 *       200:
 *         description: Label removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction or label not found
 */
router.patch('/:transactionId/remove-label', requireUserOrAdmin, TransactionController.removeLabelFromTransaction);

module.exports = router;
