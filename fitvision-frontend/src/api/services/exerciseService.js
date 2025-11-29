// src/api/services/exerciseService.js
// Exercises API calls

import { api } from "../client.js";
import { API_ENDPOINTS } from "../../constants/apiEndpoints.js";

export async function fetchExercises(filters = {}) {
  const params = {};

  if (filters.muscle) params.muscle = filters.muscle;
  if (filters.level) params.level = filters.level;

  const res = await api.get(API_ENDPOINTS.EXERCISES.LIST, { params });
  return res.data;
}

export async function fetchExerciseBySlug(slug) {
  const res = await api.get(`/api/exercises/${slug}`);
  return res.data;
}

