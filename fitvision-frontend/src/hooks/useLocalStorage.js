// src/hooks/useLocalStorage.js
// Generic hook to manage localStorage with React state sync

import { useState } from "react";
import {
  getStorageItem,
  getStorageJSON,
  setStorageItem,
  removeStorageItem,
} from "../api/utils/storage.js";

/**
 * Hook to manage localStorage with React state synchronization
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial value if key doesn't exist
 * @param {boolean} parseJSON - Whether to parse JSON (default: false)
 * @returns {[*, Function, Function]} [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue = null, parseJSON = false) {
  // Initialize state from localStorage or initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (parseJSON) {
        return getStorageJSON(key, initialValue);
      }
      const item = getStorageItem(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (valueToStore === null || valueToStore === undefined) {
        removeStorageItem(key);
      } else {
        setStorageItem(key, valueToStore);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Remove value from both state and localStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      removeStorageItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
}

