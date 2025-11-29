// middleware/metrics.js
// Prometheus metrics collection

import client from 'prom-client';
import logger from '../utils/logger.js';

// Create a Registry to register the metrics
const register = new client.Registry();

// Enable default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const aiRequestDuration = new client.Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI service requests in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

const aiRequestTotal = new client.Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI service requests',
  labelNames: ['endpoint', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(aiRequestDuration);
register.registerMetric(aiRequestTotal);

// Middleware to track HTTP requests
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route,
      status: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
}

// Track AI service requests
export function trackAIRequest(endpoint, duration, success) {
  const labels = {
    endpoint,
    status: success ? 'success' : 'error',
  };

  aiRequestDuration.observe(labels, duration / 1000);
  aiRequestTotal.inc(labels);
}

// Get metrics as Prometheus format
export async function getMetrics() {
  return register.metrics();
}

export default register;


