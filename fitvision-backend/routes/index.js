// routes/index.js
// Mount all routes

import authRoutes from './auth.js';
import profileRoutes from './profile.js';
import healthRoutes from './health.js';
import scanRoutes from './scan.js';
import coachRoutes from './coach.js';
import exercisesRoutes from './exercises.js';
import planRoutes from './plan.js';
import statsRoutes from './stats.js';

export function setupRoutes(app) {
  // Mount all routes with /api prefix
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api", scanRoutes);
  app.use("/api", coachRoutes);
  app.use("/api", exercisesRoutes);
  app.use("/api", planRoutes);
  app.use("/api", statsRoutes);
}

