// validators/scanValidator.js
// Joi validation schemas for scan and plan endpoints

import Joi from 'joi';

const bodyAnalysisSchema = Joi.object({
  posture: Joi.string().allow('').optional(),
  weak_muscles: Joi.array().items(Joi.string()).optional(),
  fat_area: Joi.string().allow('').optional(),
  score: Joi.number().min(0).max(100).required(),
  recommendations: Joi.array().items(Joi.string()).optional(),
  body_shape: Joi.string().allow('').optional(),
  risk_level: Joi.string().valid('low', 'medium', 'high').optional(),
  notes: Joi.string().allow('').optional(),
  filename: Joi.string().optional(),
  size_kb: Joi.number().optional(),
  pose_confidence: Joi.number().min(0).max(1).allow(null).optional(),
  pose_points: Joi.array().optional(),
  pose_warning: Joi.string().allow(null).optional(),
  image_url: Joi.string().uri().allow('').optional(),
  image_public_id: Joi.string().allow('').optional(),
});

const workoutPlanSchema = Joi.object({
  level: Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'beginner', 'intermediate', 'advanced').optional(),
  sessions_per_week: Joi.number().integer().min(1).max(7).optional(),
  focus_areas: Joi.array().items(Joi.string()).optional(),
  sessions: Joi.array().items(
    Joi.object({
      title: Joi.string().optional(),
      focus: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
      exercises: Joi.array().items(
        Joi.object({
          name: Joi.string().optional(),
          slug: Joi.string().optional(),
          sets: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
          reps: Joi.string().optional(),
          notes: Joi.string().allow('').optional(),
        })
      ).optional(),
    })
  ).optional(),
  source: Joi.string().optional(),
});

export const saveScanSchema = Joi.object({
  analysis: bodyAnalysisSchema.required(),
  plan: workoutPlanSchema.optional(),
});

export const generatePlanSchema = Joi.alternatives().try(
  bodyAnalysisSchema,
  Joi.object({
    analysis: bodyAnalysisSchema.required(),
    profile: Joi.object({
      goal: Joi.string().allow('').optional(),
      experience_level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      preferred_modalities: Joi.array().items(Joi.string()).optional(),
      injuries: Joi.array().items(Joi.string()).optional(),
      equipment: Joi.array().items(Joi.string()).optional(),
      nutrition_style: Joi.string().allow('').optional(),
      height_cm: Joi.number().allow(null).optional(),
      weight_kg: Joi.number().allow(null).optional(),
      weekly_sessions_target: Joi.number().allow(null).optional(),
      notes: Joi.string().allow('').optional(),
    }).optional(),
  })
);



