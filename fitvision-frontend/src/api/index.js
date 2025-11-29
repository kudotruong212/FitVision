// src/api/index.js
// Re-export all API services and client

export { api } from "./client.js";
export * from "./services/authService.js";
export * from "./services/scanService.js";
export * from "./services/coachService.js";
export * from "./services/exerciseService.js";
export * from "./services/profileService.js";
export * from "./services/statsService.js";

