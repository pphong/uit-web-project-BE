const express = require('express');
const router = express.Router();

const AlertController = require('../controllers/AlertController');
const { validate, budgetSchemas } = require('../middleware/validation');
const { authenticate, requireUserOrAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// User alert routes
router.get('/', requireUserOrAdmin, AlertController.getUserAlerts);
router.get('/active', requireUserOrAdmin, AlertController.getActiveAlerts);
router.get('/:alertId', requireUserOrAdmin, AlertController.getAlertById);
router.post('/', requireUserOrAdmin, validate(budgetSchemas.createAlert), AlertController.createAlert);
router.put('/:alertId', requireUserOrAdmin, validate(budgetSchemas.createAlert), AlertController.updateAlert);
router.delete('/:alertId', requireUserOrAdmin, AlertController.deleteAlert);
router.patch('/:alertId/toggle', requireUserOrAdmin, AlertController.toggleAlert);

module.exports = router;
