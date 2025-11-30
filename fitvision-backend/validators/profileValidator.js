// validators/profileValidator.js
// Joi validation schemas for profile endpoints

import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  goal: Joi.string().trim().max(500).allow('').optional(),
  experience_level: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .optional(),
  preferred_modalities: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim()
    )
    .optional(),
  injuries: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim()
    )
    .optional(),
  equipment: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim()
    )
    .optional(),
  nutrition_style: Joi.string().trim().max(200).allow('').optional(),
  height_cm: Joi.number().positive().max(300).allow(null).optional(),
  weight_kg: Joi.number().positive().max(500).allow(null).optional(),
  weekly_sessions_target: Joi.number().integer().min(1).max(14).allow(null).optional(),
  notes: Joi.string().trim().max(1000).allow('').optional(),
});



