// src/config/api.js
// API configuration

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_CONFIG = {
  TIMEOUT: 10000,
  DEFAULT_RETRIES: 2,
  DEFAULT_RETRY_DELAY: 500,
  RETRY_MULTIPLIER: 1.5,
  RETRYABLE_STATUS: [408, 425, 429, 500, 502, 503, 504],
  RETRY_ON_NETWORK_ERROR: true,
};

