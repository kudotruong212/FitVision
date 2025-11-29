// src/api/client.js
// Axios instance with interceptors and auth token management

import axios from "axios";
import { API_BASE, API_CONFIG } from "../config/api.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import { getStorageItem, clearAuthStorage } from "./utils/storage.js";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: API_CONFIG.TIMEOUT,
});

export { api };

// Callback để xử lý khi token invalid (để AuthContext có thể logout)
let onAuthErrorCallback = null;

export function setOnAuthError(callback) {
  onAuthErrorCallback = callback;
}

export function clearAuth() {
  delete api.defaults.headers.common["Authorization"];
  clearAuthStorage();
  
  if (onAuthErrorCallback) {
    onAuthErrorCallback();
  }
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    clearAuth();
  }
}

export function logoutUser() {
  clearAuth();
}

// Khi app khởi động, nếu localStorage đã có token thì gắn luôn
const existingToken = getStorageItem(STORAGE_KEYS.TOKEN);
if (existingToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
}

// Axios response interceptor để xử lý 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid hoặc hết hạn
      console.warn("Unauthorized request - clearing auth");
      clearAuth();
      // Redirect sẽ được xử lý bởi AuthContext hoặc component
    }
    return Promise.reject(error);
  }
);
