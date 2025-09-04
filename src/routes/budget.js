const express = require('express');
const router = express.Router();

const BudgetController = require('../controllers/BudgetController');
const { validate, budgetSchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Budget Management
 *   description: Budget management endpoints for users
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/budgets:
 *   get:
 *     summary: Get user budgets
 *     tags: [Budget Management]
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
 *         description: Number of budgets per page
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, weekly, yearly]
 *         description: Filter by budget period
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, amount, startDate, createdAt]
 *           default: startDate
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
 *         description: Budgets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireUserOrAdmin, BudgetController.getUserBudgets);

/**
 * @swagger
 * /api/v1/budgets/stats:
 *   get:
 *     summary: Get budget statistics
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *         description: Statistics period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *     responses:
 *       200:
 *         description: Budget statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', requireUserOrAdmin, BudgetController.getBudgetStats);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}:
 *   get:
 *     summary: Get budget by ID
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID
 *     responses:
 *       200:
 *         description: Budget retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid budget ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Budget not found
 */
router.get('/:budgetId', requireUserOrAdmin, BudgetController.getBudgetById);

/**
 * @swagger
 * /api/v1/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budget Management]
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
 *               - amount
 *               - period
 *               - startDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: Budget name
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Budget amount
 *               period:
 *                 type: string
 *                 enum: [monthly, weekly, yearly]
 *                 description: Budget period
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Budget start date
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Budget end date
 *               description:
 *                 type: string
 *                 description: Budget description
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       description: Category name
 *                     amount:
 *                       type: number
 *                       description: Category budget amount
 *               walletId:
 *                 type: string
 *                 description: Associated wallet ID
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Budget active status
 *     responses:
 *       201:
 *         description: Budget created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireUserOrAdmin, validate(budgetSchemas.createBudget), BudgetController.createBudget);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}:
 *   put:
 *     summary: Update budget
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Budget name
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Budget amount
 *               description:
 *                 type: string
 *                 description: Budget description
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *               isActive:
 *                 type: boolean
 *                 description: Budget active status
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Budget not found
 */
router.put('/:budgetId', requireUserOrAdmin, validate(budgetSchemas.createBudget), BudgetController.updateBudget);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}:
 *   delete:
 *     summary: Delete budget
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID
 *     responses:
 *       200:
 *         description: Budget deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid budget ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Budget not found
 */
router.delete('/:budgetId', requireUserOrAdmin, BudgetController.deleteBudget);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}/reset:
 *   patch:
 *     summary: Reset budget
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID
 *     responses:
 *       200:
 *         description: Budget reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid budget ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Budget not found
 */
router.patch('/:budgetId/reset', requireUserOrAdmin, BudgetController.resetBudget);

module.exports = router;
