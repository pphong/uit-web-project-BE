const express = require('express');
const router = express.Router();

const CategoryController = require('../controllers/CategoryController');
const categoryController = new CategoryController();
const { validate, categorySchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Category Management
 *   description: Category management endpoints for users
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get user categories
 *     tags: [Category Management]
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
 *         description: Number of categories per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [expense, income]
 *         description: Filter by category type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, type, createdAt, labelCount]
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
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireUserOrAdmin, categoryController.getUserCategories);

/**
 * @swagger
 * /api/v1/categories/stats:
 *   get:
 *     summary: Get category statistics
 *     tags: [Category Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', requireUserOrAdmin, categoryController.getCategoryStats);

/**
 * @swagger
 * /api/v1/categories/type/{type}:
 *   get:
 *     summary: Get categories by type
 *     tags: [Category Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [expense, income]
 *         description: Category type
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid category type
 *       401:
 *         description: Unauthorized
 */
router.get('/type/:type', requireUserOrAdmin, categoryController.getCategoriesByType);

/**
 * @swagger
 * /api/v1/categories/{categoryId}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Category Management]
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
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/:categoryId', requireUserOrAdmin, categoryController.getCategoryById);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Category Management]
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
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               type:
 *                 type: string
 *                 enum: [expense, income]
 *                 description: Category type
 *               description:
 *                 type: string
 *                 description: Category description
 *               color:
 *                 type: string
 *                 description: Category color (hex code)
 *               icon:
 *                 type: string
 *                 description: Category icon
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *                 description: Set as default category
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Category name already exists
 */
router.post('/', requireUserOrAdmin, validate(categorySchemas.createCategory), categoryController.createCategory);

/**
 * @swagger
 * /api/v1/categories/{categoryId}:
 *   put:
 *     summary: Update category
 *     tags: [Category Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               type:
 *                 type: string
 *                 enum: [expense, income]
 *                 description: Category type
 *               description:
 *                 type: string
 *                 description: Category description
 *               color:
 *                 type: string
 *                 description: Category color (hex code)
 *               icon:
 *                 type: string
 *                 description: Category icon
 *               isActive:
 *                 type: boolean
 *                 description: Category active status
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
router.put('/:categoryId', requireUserOrAdmin, validate(categorySchemas.updateCategory), categoryController.updateCategory);

/**
 * @swagger
 * /api/v1/categories/{categoryId}:
 *   delete:
 *     summary: Delete category
 *     tags: [Category Management]
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
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid category ID or category has labels
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.delete('/:categoryId', requireUserOrAdmin, categoryController.deleteCategory);

/**
 * @swagger
 * /api/v1/categories/search:
 *   get:
 *     summary: Search categories
 *     tags: [Category Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of categories per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [expense, income]
 *         description: Filter by category type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, type, createdAt, labelCount]
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
 *         description: Category search completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Search query is required
 *       401:
 *         description: Unauthorized
 */
router.get('/search', requireUserOrAdmin, categoryController.searchCategories);

/**
 * @swagger
 * /api/v1/categories/{categoryId}/labels:
 *   get:
 *     summary: Get labels in category
 *     tags: [Category Management]
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
 *         description: Category labels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/:categoryId/labels', requireUserOrAdmin, categoryController.getCategoryLabels);

/**
 * @swagger
 * /api/v1/categories/default/create:
 *   post:
 *     summary: Create default categories and labels
 *     tags: [Category Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Default categories and labels created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: User already has categories
 *       401:
 *         description: Unauthorized
 */
router.post('/default/create', requireUserOrAdmin, categoryController.createDefaultCategories);

/**
 * @swagger
 * /api/v1/categories/bulk-update:
 *   put:
 *     summary: Bulk update categories
 *     tags: [Category Management]
 *     security:
 *       - bearerAuth: []
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
 *                     categoryId:
 *                       type: string
 *                       description: Category ID
 *                     data:
 *                       type: object
 *                       description: Update data
 *     responses:
 *       200:
 *         description: Categories updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/bulk-update', requireUserOrAdmin, categoryController.bulkUpdateCategories);

module.exports = router;
