// Test setup file for Jest
require('dotenv').config({ path: '.env.test' });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Create mock user data
  createMockUser: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...overrides
  }),

  // Create mock wallet data
  createMockWallet: (overrides = {}) => ({
    name: 'Test Wallet',
    balance: 1000,
    currency: 'VND',
    description: 'Test wallet for testing',
    color: '#3B82F6',
    icon: 'wallet',
    ...overrides
  }),

  // Create mock expense data
  createMockExpense: (overrides = {}) => ({
    amount: 100,
    description: 'Test expense',
    category: 'food',
    date: new Date(),
    ...overrides
  }),

  // Create mock label data
  createMockLabel: (overrides = {}) => ({
    name: 'Test Label',
    color: '#EF4444',
    description: 'Test label for testing',
    icon: 'tag',
    ...overrides
  })
};

// Mock database connection
jest.mock('../config/database', () => ({
  connect: jest.fn(),
  closeConnection: jest.fn(),
  getDb: jest.fn(),
  getClient: jest.fn(),
  isConnected: jest.fn(() => true),
  getCollection: jest.fn(() => ({
    insertOne: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        skip: jest.fn(() => ({
          limit: jest.fn(() => ({
            toArray: jest.fn(() => [])
          }))
        }))
      }))
    })),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(() => 0),
    aggregate: jest.fn(() => ({
      toArray: jest.fn(() => [])
    })),
    createIndex: jest.fn(),
    insertMany: jest.fn(),
    updateMany: jest.fn(),
    bulkWrite: jest.fn()
  }))
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Setup before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
