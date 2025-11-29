// src/utils/formatters.js
// Date, number, and size formatters

/**
 * Format date to Vietnamese locale
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "";
  }
  
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };
  
  return new Intl.DateTimeFormat("vi-VN", defaultOptions).format(dateObj);
}

/**
 * Format date to short format (DD/MM/YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateShort(date) {
  return formatDate(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format number with decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = 1) {
  if (typeof num !== "number" || isNaN(num)) {
    return "0";
  }
  return num.toFixed(decimals);
}

/**
 * Format percentage
 * @param {number} num - Number to format as percentage
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(num, decimals = 0) {
  if (typeof num !== "number" || isNaN(num)) {
    return "0%";
  }
  return `${formatNumber(num, decimals)}%`;
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string (KB, MB, etc.)
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== "number" || bytes < 0) {
    return "0 B";
  }
  
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  
  if (bytes < 1024 * 1024) {
    return `${formatNumber(bytes / 1024, 1)} KB`;
  }
  
  if (bytes < 1024 * 1024 * 1024) {
    return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
  }
  
  return `${formatNumber(bytes / (1024 * 1024 * 1024), 1)} GB`;
}

