/**
 * Error handling utilities
 * Provides standardized error classes and error handling functions
 */

/**
 * Base application error class
 */
class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message Error message
   * @param {number} statusCode HTTP status code
   * @param {boolean} isOperational Whether this is an operational error
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures
 */
class ValidationError extends AppError {
  /**
   * Create a new validation error
   * @param {string} message Error message
   */
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

/**
 * Error for unauthorized access
 */
class UnauthorizedError extends AppError {
  /**
   * Create a new unauthorized error
   * @param {string} message Error message
   */
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Error for forbidden access
 */
class ForbiddenError extends AppError {
  /**
   * Create a new forbidden error
   * @param {string} message Error message
   */
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Error for resource not found
 */
class NotFoundError extends AppError {
  /**
   * Create a new not found error
   * @param {string} message Error message
   */
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Error for rate limit exceeded
 */
class RateLimitError extends AppError {
  /**
   * Create a new rate limit error
   * @param {string} message Error message
   */
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
  }
}

/**
 * Error for external API failures
 */
class ExternalApiError extends AppError {
  /**
   * Create a new external API error
   * @param {string} message Error message
   * @param {number} statusCode HTTP status code
   */
  constructor(message = 'External API error', statusCode = 503) {
    super(message, statusCode);
  }
}

/**
 * Handle errors in Express middleware
 * @param {Error} err Error object
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  
  // Log error for debugging
  console.error('ERROR:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = new ValidationError('Validation failed');
  }
  
  if (err.name === 'CastError') {
    error = new NotFoundError('Resource not found');
  }
  
  if (err.code === 11000) {
    error = new ValidationError('Duplicate field value');
  }
  
  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Internal server error',
      status: error.status || 'error'
    }
  });
}

/**
 * Catch async errors and pass them to error handler
 * @param {Function} fn Async function to wrap
 * @returns {Function} Wrapped function that catches errors
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ExternalApiError,
  errorHandler,
  catchAsync
};
