const express = require('express');
const swaggerUi = require('swagger-ui-express');
const specs = require('../config/swagger');

const router = express.Router();

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'UIT Web Project - API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

module.exports = router;





