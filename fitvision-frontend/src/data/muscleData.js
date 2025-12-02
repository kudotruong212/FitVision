// src/data/muscleData.js
// Muscle group definitions, 3D positions, and exercise mappings

export const MUSCLE_GROUPS = {
  chest: {
    name: "Ngực",
    nameEn: "Chest",
    color: "#f97373",
    position: { x: 0, y: 1.2, z: 0.3 },
    scale: { x: 0.8, y: 0.6, z: 0.3 },
    shape: "capsule", // Better shape for chest
    priority: 1.0,
    boneNames: ["spine", "chest", "upperChest", "spine_02", "spine_03", "spine1", "spine2", "spine3", "upperChest", "chest"], // Common bone names
    heightRange: { from: 0.55, to: 0.78 },
    offset: { x: 0, z: 0.2 },
    exercises: ["push-up", "bench-press", "chest-fly"],
  },
  back: {
    name: "Lưng",
    nameEn: "Back",
    color: "#60a5fa",
    position: { x: 0, y: 1.2, z: -0.3 },
    scale: { x: 0.8, y: 0.6, z: 0.3 },
    shape: "capsule",
    priority: 1.0,
    boneNames: ["spine", "back", "upperBack", "spine_02", "spine_03", "spine1", "spine2", "spine3"],
    heightRange: { from: 0.55, to: 0.85 },
    offset: { x: 0, z: -0.2 },
    exercises: ["seated-row", "lat-pulldown", "face-pull", "band-pull-apart"],
  },
  legs: {
    name: "Chân",
    nameEn: "Legs",
    color: "#4ade80",
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 0.6, y: 1.2, z: 0.4 },
    shape: "capsule", // Capsule works well for elongated muscles
    priority: 1.0,
    boneNames: ["hips", "thigh", "knee", "shin", "pelvis", "hip", "thigh_l", "thigh_r", "upperLeg", "lowerLeg", "calf"],
    heightRange: { from: 0.0, to: 0.42 },
    offset: { x: 0, z: 0 },
    exercises: ["squat", "goblet-squat", "deadlift", "lunges"],
  },
  core: {
    name: "Core",
    nameEn: "Core",
    color: "#fbbf24",
    position: { x: 0, y: 0.6, z: 0 },
    scale: { x: 0.5, y: 0.8, z: 0.3 },
    shape: "sphere", // Sphere for core/abs
    priority: 0.9,
    boneNames: ["spine", "abdomen"],
    heightRange: { from: 0.4, to: 0.6 },
    offset: { x: 0, z: 0.05 },
    exercises: ["plank", "dead-bug", "crunch", "russian-twist"],
  },
  shoulders: {
    name: "Vai",
    nameEn: "Shoulders",
    color: "#a855f7",
    position: { x: 0, y: 1.5, z: 0 },
    scale: { x: 1.0, y: 0.4, z: 0.3 },
    shape: "sphere",
    priority: 1.0,
    boneNames: ["shoulder", "clavicle", "clavicle_l", "clavicle_r", "shoulder_l", "shoulder_r", "upperArm"],
    heightRange: { from: 0.8, to: 1.0 },
    offset: { x: 0, z: 0 },
    exercises: ["shoulder-press", "lateral-raise", "face-pull"],
  },
  arms: {
    name: "Tay",
    nameEn: "Arms",
    color: "#ec4899",
    position: { x: 0.5, y: 1.0, z: 0 },
    scale: { x: 0.3, y: 0.8, z: 0.3 },
    shape: "capsule",
    priority: 0.8,
    boneNames: ["upperArm", "forearm", "upperArm_l", "upperArm_r", "forearm_l", "forearm_r", "hand"],
    heightRange: { from: 0.55, to: 0.9 },
    offset: { x: 0.6, z: 0 },
    exercises: ["bicep-curl", "tricep-extension"],
  },
  default: {
    name: "Mặc định",
    nameEn: "Default",
    color: "#a3a3a3",
    position: { x: 0, y: 1.0, z: 0 },
    scale: { x: 1, y: 2, z: 0.5 },
    shape: "box",
    priority: 0.5,
    boneNames: [],
    heightRange: { from: 0, to: 1 },
    offset: { x: 0, z: 0 },
    exercises: [],
  },
};

// Map exercise slugs to muscle groups with intensity levels
// Format: { muscleGroup: intensity } where intensity 1.0 = primary, 0.7 = secondary, 0.5 = tertiary
export const EXERCISE_TO_MUSCLES = {
  "seated-row": { back: 1.0 },
  "lat-pulldown": { back: 1.0 },
  "face-pull": { back: 0.7, shoulders: 1.0 },
  "band-pull-apart": { back: 0.8, shoulders: 0.8 },
  "plank": { core: 1.0 },
  "dead-bug": { core: 1.0 },
  "goblet-squat": { legs: 1.0, core: 0.7 },
  "push-up": { chest: 1.0, core: 0.8, arms: 0.7 },
  "squat": { legs: 1.0, core: 0.7 },
  "bench-press": { chest: 1.0, arms: 0.8 },
  "chest-fly": { chest: 1.0 },
  "deadlift": { legs: 1.0, back: 0.9, core: 0.8 },
  "lunges": { legs: 1.0 },
  "shoulder-press": { shoulders: 1.0, arms: 0.7 },
  "lateral-raise": { shoulders: 1.0 },
  "bicep-curl": { arms: 1.0 },
  "tricep-extension": { arms: 1.0 },
  "crunch": { core: 1.0 },
  "russian-twist": { core: 1.0 },
};

// Helper function to get muscle groups for an exercise (backward compatible)
export function getMuscleGroupsForExercise(exerciseSlug) {
  const mapping = EXERCISE_TO_MUSCLES[exerciseSlug];
  if (!mapping) return ["default"];
  
  // If it's the old array format, return as is
  if (Array.isArray(mapping)) return mapping;
  
  // If it's the new object format, return keys sorted by intensity
  return Object.keys(mapping).sort((a, b) => mapping[b] - mapping[a]);
}

// Get muscle intensity for an exercise
export function getMuscleIntensityForExercise(exerciseSlug, muscleGroup) {
  const mapping = EXERCISE_TO_MUSCLES[exerciseSlug];
  if (!mapping) return 0.5;
  
  // If it's the old array format, return 1.0 if included
  if (Array.isArray(mapping)) {
    return mapping.includes(muscleGroup) ? 1.0 : 0;
  }
  
  // If it's the new object format, return the intensity
  return mapping[muscleGroup] || 0;
}

// Muscle group hierarchy
export const MUSCLE_HIERARCHY = {
  upper: ["chest", "back", "shoulders", "arms"],
  lower: ["legs"],
  core: ["core"],
  full: ["chest", "back", "legs", "core", "shoulders", "arms"],
};

// Note: getMuscleGroupsForExercise is now defined above with EXERCISE_TO_MUSCLES

// Get exercises for a muscle group
export function getExercisesForMuscleGroup(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  return group?.exercises || [];
}

// Get all muscle groups
export function getAllMuscleGroups() {
  return Object.keys(MUSCLE_GROUPS).filter((key) => key !== "default");
}

