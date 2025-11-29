// src/api/services/authService.js
// Authentication API calls

import { api } from "../client.js";
import { API_ENDPOINTS } from "../../constants/apiEndpoints.js";
import { setAuthToken } from "../client.js";
import { setStorageItem } from "../utils/storage.js";
import { STORAGE_KEYS } from "../../constants/storageKeys.js";

export async function registerUser({ name, email, password, rememberMe = false }) {
  const res = await api.post(API_ENDPOINTS.AUTH.REGISTER, {
    name,
    email,
    password,
    rememberMe,
  });
  const { token, user } = res.data;
  setAuthToken(token);
  setStorageItem(STORAGE_KEYS.USER, user);
  return user;
}

export async function loginUser({ email, password, rememberMe = false }) {
  const res = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
    email,
    password,
    rememberMe,
  });
  const { token, user } = res.data;
  setAuthToken(token);
  setStorageItem(STORAGE_KEYS.USER, user);
  return user;
}

export async function verifyToken() {
  try {
    const res = await api.get(API_ENDPOINTS.PROFILE.ME);
    return { valid: true, user: res.data };
  } catch (error) {
    if (error.response?.status === 401) {
      return { valid: false };
    }
    throw error;
  }
}

export async function requestPasswordReset(email) {
  const res = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  return res.data;
}

export async function resetPassword(token, newPassword) {
  const res = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    token,
    newPassword,
  });
  return res.data;
}

export async function verifyEmail(token) {
  const res = await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
  return res.data;
}

export async function resendVerificationEmail(email) {
  const res = await api.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
  return res.data;
}

