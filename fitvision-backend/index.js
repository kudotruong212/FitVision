// index.js
// Main application entry point

import 'dotenv/config';
import express from 'express';
import { connectDB } from "./db.js";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import { initRedis } from "./services/cache.js";
import { setupMiddleware, setupErrorHandler } from "./middleware/index.js";
import { setupRoutes } from "./routes/index.js";

// Re-export commonly used functions for backward compatibility
export { getQuotaState, incrementQuota } from "./services/quotaService.js";
export { serializeSession } from "./utils/sessionUtils.js";
export { encryptSensitive, decryptSensitive } from "./services/encryptionService.js";

export const app = express();

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Setup error handler (must be after routes)
setupErrorHandler(app);

const PORT = config.server.port;

export const start = async () => {
  try {
    await connectDB();
    
    // Initialize Redis if configured
    if (config.redis.url) {
      initRedis();
    }
    
    app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`, { 
        port: PORT, 
        env: config.server.nodeEnv 
      });
    });
  } catch (err) {
    logger.error("Failed to start server", { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}
