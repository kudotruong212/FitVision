// src/api/utils/storage.js
// localStorage helpers

import { STORAGE_KEYS } from "../../constants/storageKeys.js";

/**
 * Get an item from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {string|null} The stored value or null
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (error) {
    console.error(`Error getting storage item ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Get and parse JSON from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or parse fails
 * @returns {*} The parsed value or defaultValue
 */
export function getStorageJSON(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error parsing storage item ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set an item in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be stringified if not a string)
 */
export function setStorageItem(key, value) {
  try {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error setting storage item ${key}:`, error);
  }
}

/**
 * Remove an item from localStorage
 * @param {string} key - Storage key
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing storage item ${key}:`, error);
  }
}

/**
 * Clear all items with a given prefix
 * @param {string} prefix - Prefix to match
 */
export function clearStorageByPrefix(prefix) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error(`Error clearing storage by prefix ${prefix}:`, error);
  }
}

/**
 * Get all storage keys
 * @returns {string[]} Array of all storage keys
 */
export function getAllStorageKeys() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    return keys;
  } catch (error) {
    console.error("Error getting all storage keys:", error);
    return [];
  }
}

/**
 * Clear all authentication-related storage
 */
export function clearAuthStorage() {
  removeStorageItem(STORAGE_KEYS.TOKEN);
  removeStorageItem(STORAGE_KEYS.USER);
  removeStorageItem(STORAGE_KEYS.LAST_ANALYSIS);
  clearStorageByPrefix(STORAGE_KEYS.HISTORY_PREFIX);
}

