// src/utils/3d/muscleMapping.js
// Muscle group mapping utilities for 3D visualization

import { MUSCLE_GROUPS, EXERCISE_TO_MUSCLES, getMuscleIntensityForExercise } from "../../data/muscleData.js";

/**
 * Get color for a muscle group
 */
export function getMuscleColor(muscleGroup) {
  return MUSCLE_GROUPS[muscleGroup]?.color || MUSCLE_GROUPS.default.color;
}

/**
 * Get 3D position for a muscle group
 */
export function getMusclePosition(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.position;
  return { ...group.position };
}

/**
 * Get 3D scale for a muscle group
 */
export function getMuscleScale(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.scale;
  return { ...group.scale };
}

/**
 * Get shape type for a muscle group
 */
export function getMuscleShape(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.shape || "box";
  return group.shape || "box";
}

export function getMuscleHeightRange(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.heightRange || { from: 0, to: 1 };
  return group.heightRange || MUSCLE_GROUPS.default.heightRange || { from: 0, to: 1 };
}

export function getMuscleOffset(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.offset || { x: 0, z: 0 };
  return group.offset || MUSCLE_GROUPS.default.offset || { x: 0, z: 0 };
}

/**
 * Get bone names for a muscle group (for skinned mesh integration)
 */
export function getMuscleBoneNames(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.boneNames || [];
  return group.boneNames || [];
}

/**
 * Get priority for a muscle group
 */
export function getMusclePriority(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  if (!group) return MUSCLE_GROUPS.default.priority || 0.5;
  return group.priority || 0.5;
}

/**
 * Get muscle groups for an exercise
 */
export function getMuscleGroupsForExercise(exerciseSlug) {
  const mapping = EXERCISE_TO_MUSCLES[exerciseSlug];
  if (!mapping) return ["default"];
  
  // If it's the old array format, return as is
  if (Array.isArray(mapping)) return mapping;
  
  // If it's the new object format, return keys sorted by intensity
  return Object.keys(mapping).sort((a, b) => mapping[b] - mapping[a]);
}

/**
 * Get muscle intensity for an exercise
 */
export function getMuscleIntensity(exerciseSlug, muscleGroup) {
  return getMuscleIntensityForExercise(exerciseSlug, muscleGroup);
}

/**
 * Get all muscle groups from a list of muscle names (from body scan)
 */
export function normalizeMuscleNames(muscleNames) {
  if (!Array.isArray(muscleNames)) return [];
  
  const normalized = [];
  const nameMap = {
    chest: "chest",
    "upper chest": "chest",
    pectorals: "chest",
    back: "back",
    "upper back": "back",
    lats: "back",
    "latissimus dorsi": "back",
    legs: "legs",
    quads: "legs",
    quadriceps: "legs",
    hamstrings: "legs",
    glutes: "legs",
    core: "core",
    abs: "core",
    "abdominal": "core",
    shoulders: "shoulders",
    delts: "shoulders",
    deltoids: "shoulders",
    arms: "arms",
    biceps: "arms",
    triceps: "arms",
  };

  muscleNames.forEach((name) => {
    const lower = String(name).toLowerCase().trim();
    const mapped = nameMap[lower];
    if (mapped && !normalized.includes(mapped)) {
      normalized.push(mapped);
    }
  });

  return normalized.length > 0 ? normalized : ["default"];
}

/**
 * Get highlight intensity based on score or priority
 */
export function getHighlightIntensity(score) {
  if (score >= 80) return 1.0; // Full highlight for good scores
  if (score >= 60) return 0.7;
  if (score >= 40) return 0.5;
  return 0.3; // Low highlight for poor scores
}

/**
 * Get color with intensity adjustment
 */
export function getColorWithIntensity(baseColor, intensity = 1.0) {
  // Convert hex to RGB
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Apply intensity
  const newR = Math.round(r * intensity);
  const newG = Math.round(g * intensity);
  const newB = Math.round(b * intensity);

  return `rgb(${newR}, ${newG}, ${newB})`;
}

