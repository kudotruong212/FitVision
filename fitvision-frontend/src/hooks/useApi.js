// src/hooks/useApi.js
// Generic API hook with loading, error, and data states

import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for API calls with loading, error, and data states
 * @param {Function} apiFunction - The async API function to call
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {boolean} immediate - Whether to call immediately on mount (default: true)
 * @returns {Object} { data, loading, error, refetch }
 */
export function useApi(apiFunction, dependencies = [], immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    if (!apiFunction) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return { data, loading, error, refetch };
}

