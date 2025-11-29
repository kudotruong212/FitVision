// src/api/utils/retry.js
// Retry logic utility

import { API_CONFIG } from "../../config/api.js";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a request function with exponential backoff
 * @param {Function} requestFn - The async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.retries - Number of retries (default: 2)
 * @param {number} options.delay - Initial delay in ms (default: 500)
 * @param {number} options.multiplier - Backoff multiplier (default: 1.5)
 * @param {number[]} options.retryOn - HTTP status codes to retry on
 * @param {boolean} options.retryOnNetworkError - Retry on network errors (default: true)
 * @returns {Promise} The result of the request function
 */
export async function withRetry(requestFn, options = {}) {
  const {
    retries = API_CONFIG.DEFAULT_RETRIES,
    delay = API_CONFIG.DEFAULT_RETRY_DELAY,
    multiplier = API_CONFIG.RETRY_MULTIPLIER,
    retryOn = API_CONFIG.RETRYABLE_STATUS,
    retryOnNetworkError = API_CONFIG.RETRY_ON_NETWORK_ERROR,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      const status = error.response?.status;
      const isNetworkError = !status;
      const shouldRetry =
        (status && retryOn.includes(status)) ||
        (retryOnNetworkError && isNetworkError);

      if (!shouldRetry || attempt === retries) {
        throw error;
      }

      const backoff = Math.round(delay * multiplier ** attempt);
      await wait(backoff);
    }
  }
}

