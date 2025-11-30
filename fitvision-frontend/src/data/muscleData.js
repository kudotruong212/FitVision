// src/data/muscleData.js
// Muscle group definitions, 3D positions, and exercise mappings

export const MUSCLE_GROUPS = {
  chest: {
    name: "Ngực",
    nameEn: "Chest",
    color: "#f97373",
    position: { x: 0, y: 1.2, z: 0.3 },
    scale: { x: 0.8, y: 0.6, z: 0.3 },
    exercises: ["push-up", "bench-press", "chest-fly"],
  },
  back: {
    name: "Lưng",
    nameEn: "Back",
    color: "#60a5fa",
    position: { x: 0, y: 1.2, z: -0.3 },
    scale: { x: 0.8, y: 0.6, z: 0.3 },
    exercises: ["seated-row", "lat-pulldown", "face-pull", "band-pull-apart"],
  },
  legs: {
    name: "Chân",
    nameEn: "Legs",
    color: "#4ade80",
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 0.6, y: 1.2, z: 0.4 },
    exercises: ["squat", "goblet-squat", "deadlift", "lunges"],
  },
  core: {
    name: "Core",
    nameEn: "Core",
    color: "#fbbf24",
    position: { x: 0, y: 0.6, z: 0 },
    scale: { x: 0.5, y: 0.8, z: 0.3 },
    exercises: ["plank", "dead-bug", "crunch", "russian-twist"],
  },
  shoulders: {
    name: "Vai",
    nameEn: "Shoulders",
    color: "#a855f7",
    position: { x: 0, y: 1.5, z: 0 },
    scale: { x: 1.0, y: 0.4, z: 0.3 },
    exercises: ["shoulder-press", "lateral-raise", "face-pull"],
  },
  arms: {
    name: "Tay",
    nameEn: "Arms",
    color: "#ec4899",
    position: { x: 0.5, y: 1.0, z: 0 },
    scale: { x: 0.3, y: 0.8, z: 0.3 },
    exercises: ["bicep-curl", "tricep-extension"],
  },
  default: {
    name: "Mặc định",
    nameEn: "Default",
    color: "#a3a3a3",
    position: { x: 0, y: 1.0, z: 0 },
    scale: { x: 1, y: 2, z: 0.5 },
    exercises: [],
  },
};

// Map exercise slugs to muscle groups
export const EXERCISE_TO_MUSCLES = {
  "seated-row": ["back"],
  "lat-pulldown": ["back"],
  "face-pull": ["back", "shoulders"],
  "band-pull-apart": ["back", "shoulders"],
  "plank": ["core"],
  "dead-bug": ["core"],
  "goblet-squat": ["legs", "core"],
  "push-up": ["chest", "core", "arms"],
  "squat": ["legs", "core"],
  "bench-press": ["chest", "arms"],
  "chest-fly": ["chest"],
  "deadlift": ["legs", "back", "core"],
  "lunges": ["legs"],
  "shoulder-press": ["shoulders", "arms"],
  "lateral-raise": ["shoulders"],
  "bicep-curl": ["arms"],
  "tricep-extension": ["arms"],
  "crunch": ["core"],
  "russian-twist": ["core"],
};

// Muscle group hierarchy
export const MUSCLE_HIERARCHY = {
  upper: ["chest", "back", "shoulders", "arms"],
  lower: ["legs"],
  core: ["core"],
  full: ["chest", "back", "legs", "core", "shoulders", "arms"],
};

// Get muscle groups for an exercise
export function getMuscleGroupsForExercise(exerciseSlug) {
  return EXERCISE_TO_MUSCLES[exerciseSlug] || ["default"];
}

// Get exercises for a muscle group
export function getExercisesForMuscleGroup(muscleGroup) {
  const group = MUSCLE_GROUPS[muscleGroup];
  return group?.exercises || [];
}

// Get all muscle groups
export function getAllMuscleGroups() {
  return Object.keys(MUSCLE_GROUPS).filter((key) => key !== "default");
}

