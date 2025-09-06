const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UIT Web Project - Expense Management API',
      version: '1.0.0',
      description: 'API documentation for the Expense Management System built with Node.js, Express, and MongoDB',
      contact: {
        name: 'Pham Phong - 24550034',
        email: '245500344@gm.uit.edu.vn',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.uit-web-project.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            email: { type: 'string', format: 'email', description: 'User email' },
            firstName: { type: 'string', description: 'User first name' },
            lastName: { type: 'string', description: 'User last name' },
            role: { type: 'string', enum: ['admin', 'user'], description: 'User role' },
            isActive: { type: 'boolean', description: 'User active status' },
            isEmailVerified: { type: 'boolean', description: 'Email verification status' },
            profilePicture: { type: 'string', description: 'Profile picture URL' },
            phoneNumber: { type: 'string', description: 'Phone number' },
            dateOfBirth: { type: 'string', format: 'date', description: 'Date of birth' },
            address: { type: 'string', description: 'User address' },
            preferences: {
              type: 'object',
              properties: {
                currency: { type: 'string', description: 'Preferred currency' },
                language: { type: 'string', description: 'Preferred language' },
                timezone: { type: 'string', description: 'Timezone' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Wallet ID' },
            name: { type: 'string', description: 'Wallet name' },
            userId: { type: 'string', description: 'Owner user ID' },
            balance: { type: 'number', description: 'Current balance' },
            currency: { type: 'string', description: 'Wallet currency' },
            isDefault: { type: 'boolean', description: 'Default wallet flag' },
            isActive: { type: 'boolean', description: 'Wallet active status' },
            description: { type: 'string', description: 'Wallet description' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Expense ID' },
            userId: { type: 'string', description: 'Owner user ID' },
            walletId: { type: 'string', description: 'Wallet ID' },
            amount: { type: 'number', description: 'Expense amount' },
            category: { type: 'string', description: 'Expense category' },
            description: { type: 'string', description: 'Expense description' },
            date: { type: 'string', format: 'date', description: 'Expense date' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Associated labels' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'], description: 'Expense status' },
            isRecurring: { type: 'boolean', description: 'Recurring expense flag' },
            recurringDetails: {
              type: 'object',
              properties: {
                frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
                interval: { type: 'number', description: 'Recurring interval' },
                endDate: { type: 'string', format: 'date' },
              },
            },
            splitDetails: {
              type: 'object',
              properties: {
                isSplit: { type: 'boolean' },
                splitWith: { type: 'array', items: { type: 'string' } },
                splitAmount: { type: 'number' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Label: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Label ID' },
            name: { type: 'string', description: 'Label name' },
            userId: { type: 'string', description: 'Owner user ID' },
            category: { type: 'string', description: 'Label category' },
            color: { type: 'string', description: 'Label color' },
            icon: { type: 'string', description: 'Label icon' },
            isDefault: { type: 'boolean', description: 'Default label flag' },
            isActive: { type: 'boolean', description: 'Label active status' },
            usageCount: { type: 'number', description: 'Usage count' },
            lastUsedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Response success status' },
            message: { type: 'string', description: 'Response message' },
            data: { type: 'object', description: 'Response data' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', description: 'Error message' },
            error: { type: 'string', description: 'Error details' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;





