// src/api/services/profileService.js
// User profile API calls

import { api } from "../client.js";
import { API_ENDPOINTS } from "../../constants/apiEndpoints.js";

export async function fetchProfile() {
  const res = await api.get(API_ENDPOINTS.PROFILE.ME);
  return res.data;
}

export async function updateProfile(profile) {
  const res = await api.put(API_ENDPOINTS.PROFILE.ME, profile);
  return res.data;
}

