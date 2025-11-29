// middleware/requestId.js
// Request ID tracking middleware

import { randomUUID } from 'crypto';

export function requestIdMiddleware(req, res, next) {
  // Get request ID from header or generate new one
  req.id = req.headers['x-request-id'] || randomUUID();
  
  // Set response header
  res.setHeader('X-Request-ID', req.id);
  
  next();
}


