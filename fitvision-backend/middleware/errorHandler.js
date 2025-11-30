// middleware/errorHandler.js
// Centralized error handling middleware

import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  // Get request ID if available
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      requestId,
      error: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error', {
      requestId,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
    });
  }

  // Send error response
  if (err instanceof AppError) {
    const response = {
      error: err.message,
      requestId,
    };

    // Include details for validation errors
    if (err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unknown errors - don't expose details in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: message,
    requestId,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

// Async error wrapper
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}



