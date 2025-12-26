/**
 * Centralized Error Handler Middleware
 * Handles all errors in a consistent format and prevents stack trace leaks in production
 */

/**
 * Custom Error class with status code
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error logger - logs errors with context
 */
const logError = (err, req) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req?.path,
    method: req?.method,
    ip: req?.ip,
    userId: req?.user?.id,
    body: req?.body,
    query: req?.query,
    params: req?.params
  };

  // In production, you might want to send this to a logging service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    console.error('[ERROR]', JSON.stringify({
      timestamp: errorInfo.timestamp,
      error: errorInfo.error,
      path: errorInfo.path,
      method: errorInfo.method,
      userId: errorInfo.userId
    }));
  } else {
    console.error('[ERROR]', errorInfo);
  }
};

/**
 * Main error handler middleware
 * Should be placed AFTER all routes
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, req);

  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error' // Hide details in production for 500 errors
      : err.message,
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.path = req.path;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation failed';
    errorResponse.details = err.details || err.message;
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.error = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error = 'Token expired';
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    errorResponse.error = 'Duplicate entry';
    errorResponse.field = err.errors?.[0]?.path;
  }

  if (err.name === 'SequelizeValidationError') {
    errorResponse.error = 'Validation error';
    errorResponse.details = err.errors?.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Should be placed BEFORE error handler but AFTER all routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.method} ${req.url} not found`, 404);
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
