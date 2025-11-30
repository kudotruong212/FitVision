// src/config/3dModels.js
// Configuration for 3D models used in the application

/**
 * Default model URLs
 * Set these to your actual model paths or use CDN URLs
 */
export const MODEL_URLS = {
  // Human body model (main)
  humanBody: "/models/human-body.glb",
  
  // Exercise-specific models (optional)
  exercises: {
    squat: "/models/exercises/squat.glb", // Actual filename
    "goblet-squat": "/models/exercises/squat.glb", // Can reuse squat model
    "push-up": "/models/exercises/push-up.glb",
    plank: "/models/exercises/plank.glb",
    "seated-row": "/models/exercises/seated-row.glb",
    "face-pull": "/models/exercises/face-pull.glb",
    "dead-bug": "/models/exercises/dead-bug.glb",
  },
};

/**
 * Alternative: Use CDN models (examples)
 * Uncomment and modify if you want to use external models
 */
export const CDN_MODEL_URLS = {
  // Example: Mixamo models
  // humanBody: "https://cdn.example.com/models/human-body.glb",
  
  // Example: Sketchfab models (if you have direct links)
  // exercises: {
  //   squat: "https://cdn.example.com/models/squat.glb",
  // },
};

/**
 * Get model URL for an exercise
 * Tries both lowercase and original case
 */
export function getExerciseModelUrl(exerciseSlug) {
  const url = MODEL_URLS.exercises[exerciseSlug];
  if (url) return url;
  
  // Try case variations
  const basePath = `/models/exercises/${exerciseSlug}.glb`;
  return basePath;
}

/**
 * Get human body model URL
 */
export function getHumanBodyModelUrl() {
  return MODEL_URLS.humanBody || null;
}

/**
 * Check if model exists (for fallback logic)
 */
export async function checkModelExists(url) {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

