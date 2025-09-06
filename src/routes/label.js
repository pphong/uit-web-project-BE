const express = require('express');
const router = express.Router();

const LabelController = require('../controllers/LabelController');
const labelController = new LabelController();
const { validate, labelSchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Label Management
 *   description: Label management endpoints for users
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/labels:
 *   get:
 *     summary: Get user labels
 *     tags: [Label Management]
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
 *         description: Number of labels per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: isDefault
 *         schema:
 *           type: boolean
 *         description: Filter by default status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, category, usageCount, createdAt]
 *           default: name
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireUserOrAdmin, (req, res) => labelController.getUserLabels(req, res));

/**
 * @swagger
 * /api/v1/labels/stats:
 *   get:
 *     summary: Get label statistics
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Label statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', requireUserOrAdmin, (req, res) => labelController.getLabelStats(req, res));

/**
 * @swagger
 * /api/v1/labels/most-used:
 *   get:
 *     summary: Get most used labels
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of labels to return
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: month
 *         description: Time period for usage statistics
 *     responses:
 *       200:
 *         description: Most used labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/most-used', requireUserOrAdmin, (req, res) => labelController.getMostUsedLabels(req, res));

/**
 * @swagger
 * /api/v1/labels/recently-used:
 *   get:
 *     summary: Get recently used labels
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of labels to return
 *     responses:
 *       200:
 *         description: Recently used labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/recently-used', requireUserOrAdmin, (req, res) => labelController.getRecentlyUsedLabels(req, res));

/**
 * @swagger
 * /api/v1/labels/{labelId}:
 *   get:
 *     summary: Get label by ID
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Label ID
 *     responses:
 *       200:
 *         description: Label retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid label ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Label not found
 */
router.get('/:labelId', requireUserOrAdmin, (req, res) => labelController.getLabelById(req, res));

/**
 * @swagger
 * /api/v1/labels:
 *   post:
 *     summary: Create a new label
 *     tags: [Label Management]
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
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Label name
 *               category:
 *                 type: string
 *                 description: Label category
 *               color:
 *                 type: string
 *                 description: Label color (hex code)
 *               icon:
 *                 type: string
 *                 description: Label icon
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *                 description: Set as default label
 *     responses:
 *       201:
 *         description: Label created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireUserOrAdmin, validate(labelSchemas.createLabel), (req, res) => labelController.createLabel(req, res));

/**
 * @swagger
 * /api/v1/labels/{labelId}:
 *   put:
 *     summary: Update label
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Label ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Label name
 *               category:
 *                 type: string
 *                 description: Label category
 *               color:
 *                 type: string
 *                 description: Label color (hex code)
 *               icon:
 *                 type: string
 *                 description: Label icon
 *               isActive:
 *                 type: boolean
 *                 description: Label active status
 *     responses:
 *       200:
 *         description: Label updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Label not found
 */
router.put('/:labelId', requireUserOrAdmin, validate(labelSchemas.updateLabel), (req, res) => labelController.updateLabel(req, res));

/**
 * @swagger
 * /api/v1/labels/{labelId}:
 *   delete:
 *     summary: Delete label
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Label ID
 *     responses:
 *       200:
 *         description: Label deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid label ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Label not found
 */
router.delete('/:labelId', requireUserOrAdmin, (req, res) => labelController.deleteLabel(req, res));

/**
 * @swagger
 * /api/v1/labels/{labelId}/set-default:
 *   patch:
 *     summary: Set label as default
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Label ID
 *     responses:
 *       200:
 *         description: Default label set successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid label ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Label not found
 */
router.patch('/:labelId/set-default', requireUserOrAdmin, (req, res) => labelController.setDefaultLabel(req, res));

/**
 * @swagger
 * /api/v1/labels/category/{categoryId}:
 *   get:
 *     summary: Get labels by category ID
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/category/:categoryId', requireUserOrAdmin, (req, res) => labelController.getLabelsByCategoryId(req, res));

/**
 * @swagger
 * /api/v1/labels/category-name/{category}:
 *   get:
 *     summary: Get labels by category name (legacy)
 *     tags: [Label Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *     responses:
 *       200:
 *         description: Labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/category-name/:category', requireUserOrAdmin, (req, res) => labelController.getLabelsByCategory(req, res));

module.exports = router;
