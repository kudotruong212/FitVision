// utils/metricsUtils.js
// Metrics and calculation utility functions

export function estimatePoseSymmetry(points = []) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const xs = points
    .map((pt) => (typeof pt.x === "number" ? pt.x : null))
    .filter((x) => x !== null);
  if (!xs.length) return null;
  const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const variance =
    xs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / Math.max(xs.length, 1);
  const normalized = Math.max(0, 1 - Math.min(variance * 10, 1));
  return Math.round(normalized * 100);
}

export function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function stddev(values = []) {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance =
    values.reduce((sum, val) => sum + (val - avg) ** 2, 0) /
    Math.max(values.length, 1);
  return Math.sqrt(variance);
}

