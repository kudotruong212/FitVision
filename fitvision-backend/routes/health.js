// routes/health.js
// Comprehensive health check endpoints

import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import cloudinary from '../cloudinary.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { get } from '../services/cache.js';

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    services: {},
  };

  // Database check
  try {
    const dbState = mongoose.connection.readyState;
    health.services.database = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      state: dbState,
    };
  } catch (err) {
    health.services.database = {
      status: 'error',
      error: err.message,
    };
    health.status = 'degraded';
  }

  // AI Service check
  try {
    const response = await axios.get(`${config.ai.serviceUrl}/ai/health`, {
      timeout: 5000,
    });
    health.services.aiService = {
      status: response.data.status === 'ok' ? 'connected' : 'error',
      response: response.data,
    };
  } catch (err) {
    health.services.aiService = {
      status: 'error',
      error: err.message,
    };
    health.status = 'degraded';
  }

  // Redis check
  try {
    const testKey = 'health:check';
    await get(testKey);
    health.services.redis = {
      status: 'connected',
    };
  } catch (err) {
    health.services.redis = {
      status: 'error',
      error: err.message,
    };
    // Redis is optional, don't mark as degraded
  }

  // Cloudinary check
  try {
    // Simple ping by checking config
    if (config.cloudinary.cloudName && config.cloudinary.apiKey) {
      health.services.cloudinary = {
        status: 'configured',
      };
    } else {
      health.services.cloudinary = {
        status: 'not_configured',
      };
    }
  } catch (err) {
    health.services.cloudinary = {
      status: 'error',
      error: err.message,
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;


