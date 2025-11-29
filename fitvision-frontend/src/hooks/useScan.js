// src/hooks/useScan.js
// Scan-specific hooks

import { useState, useEffect } from "react";
import {
  fetchScanQuota,
  fetchScanHistory,
  analyzeBody,
} from "../api/services/scanService.js";

/**
 * Hook to manage scan quota
 * @returns {Object} { quota, loading, error, refetch }
 */
export function useScanQuota() {
  const [quota, setQuota] = useState({
    allowed: true,
    left: null,
    max: null,
    date: null,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScanQuota();
      setQuota(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { quota, loading, error, refetch };
}

/**
 * Hook to manage scan history
 * @param {number} limit - Number of items to fetch (default: 20)
 * @returns {Object} { history, loading, error, refetch }
 */
export function useScanHistory(limit = 20) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScanHistory(limit);
      setHistory(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [limit]);

  return { history, loading, error, refetch };
}

/**
 * Hook to manage scan analysis
 * @returns {Object} { analyzing, error, analyze }
 */
export function useScanAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async (formData, onUploadProgress) => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeBody(formData, onUploadProgress);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  return { analyzing, error, analyze };
}

