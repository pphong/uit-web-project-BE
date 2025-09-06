const express = require('express');
const router = express.Router();

const WalletController = require('../controllers/WalletController');
const walletController = new WalletController();
const { validate, walletSchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Wallet Management
 *   description: Wallet management endpoints for users
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/wallets:
 *   get:
 *     summary: Get user wallets
 *     tags: [Wallet Management]
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
 *         description: Number of wallets per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, balance, createdAt, updatedAt]
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
 *         description: Wallets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireUserOrAdmin, (req, res) => walletController.getUserWallets(req, res));

/**
 * @swagger
 * /api/v1/wallets/stats:
 *   get:
 *     summary: Get wallet statistics
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', requireUserOrAdmin, (req, res) => walletController.getWalletStats(req, res));

/**
 * @swagger
 * /api/v1/wallets/{walletId}:
 *   get:
 *     summary: Get wallet by ID
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid wallet ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/:walletId', requireUserOrAdmin, (req, res) => walletController.getWalletById(req, res));

/**
 * @swagger
 * /api/v1/wallets:
 *   post:
 *     summary: Create a new wallet
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - currency
 *             properties:
 *               name:
 *                 type: string
 *                 description: Wallet name
 *               currency:
 *                 type: string
 *                 description: Wallet currency (e.g., USD, VND, EUR)
 *               description:
 *                 type: string
 *                 description: Wallet description
 *               initialBalance:
 *                 type: number
 *                 default: 0
 *                 description: Initial wallet balance
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *                 description: Set as default wallet
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  requireUserOrAdmin,
  validate(walletSchemas.createWallet),
  (req, res) => walletController.createWallet(req, res)
);

/**
 * @swagger
 * /api/v1/wallets/{walletId}:
 *   put:
 *     summary: Update wallet
 *     tags: [Wallet Management]
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
 *               name:
 *                 type: string
 *                 description: Wallet name
 *               description:
 *                 type: string
 *                 description: Wallet description
 *               isActive:
 *                 type: boolean
 *                 description: Wallet active status
 *     responses:
 *       200:
 *         description: Wallet updated successfully
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
router.put(
  '/:walletId',
  requireUserOrAdmin,
  validate(walletSchemas.updateWallet),
  (req, res) => walletController.updateWallet(req, res)
);

/**
 * @swagger
 * /api/v1/wallets/{walletId}:
 *   delete:
 *     summary: Delete wallet
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Wallet deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid wallet ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.delete('/:walletId', requireUserOrAdmin, (req, res) => walletController.deleteWallet(req, res));

/**
 * @swagger
 * /api/v1/wallets/{walletId}/set-default:
 *   patch:
 *     summary: Set wallet as default
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Default wallet set successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid wallet ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.patch(
  '/:walletId/set-default',
  requireUserOrAdmin,
  (req, res) => walletController.setDefaultWallet(req, res)
);

/**
 * @swagger
 * /api/v1/wallets/transfer:
 *   post:
 *     summary: Transfer between wallets
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromWalletId
 *               - toWalletId
 *               - amount
 *             properties:
 *               fromWalletId:
 *                 type: string
 *                 description: Source wallet ID
 *               toWalletId:
 *                 type: string
 *                 description: Destination wallet ID
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Transfer amount
 *               description:
 *                 type: string
 *                 description: Transfer description
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request or insufficient balance
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.post(
  '/transfer',
  requireUserOrAdmin,
  validate(walletSchemas.transfer),
  (req, res) => walletController.transferBetweenWallets(req, res)
);

module.exports = router;
