// middleware/index.js
// Setup all middleware

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { initSentry } from '../utils/sentry.js';
import { requestIdMiddleware } from './requestId.js';
import { metricsMiddleware } from './metrics.js';
import { errorHandler } from './errorHandler.js';

export function setupMiddleware(app) {
  // Initialize Sentry if configured
  initSentry();

  // Request ID middleware (must be early in the chain)
  app.use(requestIdMiddleware);

  // Metrics middleware
  app.use(metricsMiddleware);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Cloudinary images
  }));

  // CORS configuration
  app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));

  // Body parser
  app.use(express.json({ limit: '10mb' }));

  // API Documentation (Swagger) - setup asynchronously
  setupSwagger(app).catch((err) => {
    logger.warn("Swagger setup failed", { error: err.message });
  });
}

async function setupSwagger(app) {
  try {
    const swaggerModule = await import("../docs/swagger.js");
    app.use('/api/docs', swaggerModule.swaggerUi.serve, swaggerModule.swaggerUi.setup(swaggerModule.swaggerSpec));
    logger.info("Swagger UI available at /api/docs");
  } catch (err) {
    logger.warn("Swagger not available", { error: err.message });
  }
}

// Export function to add error handler (must be called after routes)
export function setupErrorHandler(app) {
  app.use(errorHandler);
}

