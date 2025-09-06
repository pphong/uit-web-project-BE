require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');
const path = require('path');

const database = require('./config/database');
const logger = require('./utils/logger');
const ApiResponse = require('./utils/response');
const NotificationService = require('./services/NotificationService');
const notificationService = new NotificationService();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const transactionRoutes = require('./routes/transaction');
const labelRoutes = require('./routes/label');
const categoryRoutes = require('./routes/category');
const docsRoutes = require('./routes/docs');

// Import models for index creation
const User = require('./models/User');
const Wallet = require('./models/Wallet');
const Transaction = require('./models/Transaction');
const Label = require('./models/Label');
const Category = require('./models/Category');

// Create model instances
const userModel = new User();
const walletModel = new Wallet();
const transactionModel = new Transaction();
const labelModel = new Label();
const categoryModel = new Category();

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, 429, 'Too many requests from this IP, please try again later.', null, 'RATE_LIMIT_EXCEEDED');
  },
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Static files (for uploads, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
const apiPrefix = `/api/${apiVersion}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/wallets`, walletRoutes);
app.use(`${apiPrefix}/transactions`, transactionRoutes);
app.use(`${apiPrefix}/labels`, labelRoutes);
app.use(`${apiPrefix}/categories`, categoryRoutes);

// API Documentation (Swagger UI)
app.use('/docs', docsRoutes);

// API documentation endpoint
app.get(`${apiPrefix}/docs`, (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    version: apiVersion,
    endpoints: {
      auth: `${apiPrefix}/auth`,
      users: `${apiPrefix}/users`,
      wallets: `${apiPrefix}/wallets`,
      transactions: `${apiPrefix}/transactions`,
      labels: `${apiPrefix}/labels`,
      categories: `${apiPrefix}/categories`,
    },
    documentation: 'API documentation will be available here',
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
});

// Global error handling middleware
app.use((error, req, res) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.email || 'anonymous',
    ip: req.ip,
  });

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      type: err.kind,
    }));
    return ApiResponse.unprocessableEntity(res, 'Validation failed', errors);
  }

  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return ApiResponse.badRequest(res, 'Invalid ID format');
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  return ApiResponse.error(res, statusCode, message, null, 'INTERNAL_SERVER_ERROR');
});

// Initialize database and indexes
async function initializeApp() {
  try {
    // Connect to database
    await database.connect();
    
    // Create indexes for all collections
    await Promise.all([
      userModel.createIndexes(),
      walletModel.createIndexes(),
      transactionModel.createIndexes(),
      labelModel.createIndexes(),
      categoryModel.createIndexes()
    ]);
    
    logger.info('✅ Database indexes created successfully');
    
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(` Health check: http://localhost:${port}/health`);
      logger.info(`📚 API docs: http://localhost:${port}/docs`);
      logger.info(`🔌 API endpoints: http://localhost:${port}/api`);
      logger.info(`🔌 WebSocket: ws://localhost:${port}/ws`);
    });

    // Initialize WebSocket service
    try {
      await notificationService.initialize(server);
      logger.info('✅ WebSocket service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize WebSocket service:', error);
    }
  } catch (error) {
    logger.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  try {
    await notificationService.close();
    await database.closeConnection();
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await notificationService.close();
    await database.closeConnection();
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  throw error;
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  throw new Error(`Unhandled Rejection: ${reason}`);
});

// Start the application
initializeApp();

module.exports = app;
