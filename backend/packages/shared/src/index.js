const { loadEnv } = require('./env');
const { createLogger } = require('./logger');
const {
  createNotFoundHandler,
  createErrorHandler,
  formatValidationErrors
} = require('./errors');
const { asyncHandler } = require('./asyncHandler');
const {
  createServiceApp,
  registerHealthEndpoint,
  requestLogger
} = require('./express');
const { authenticateRequest } = require('./auth');

module.exports = {
  loadEnv,
  createLogger,
  createNotFoundHandler,
  createErrorHandler,
  formatValidationErrors,
  asyncHandler,
  createServiceApp,
  registerHealthEndpoint,
  requestLogger,
  authenticateRequest
};
