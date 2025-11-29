import express from "express";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema } from "../validators/profileValidator.js";
import { get, set, del, cacheKeys } from "../services/cache.js";

const router = express.Router();

const baseProfile = {
  goal: "",
  experience_level: "beginner",
  preferred_modalities: [],
  injuries: [],
  equipment: [],
  nutrition_style: "",
  height_cm: null,
  weight_kg: null,
  weekly_sessions_target: null,
  notes: "",
};

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serializeProfile(profileDoc) {
  const plain =
    profileDoc && typeof profileDoc.toObject === "function"
      ? profileDoc.toObject()
      : profileDoc || {};
  return {
    ...baseProfile,
    ...plain,
    preferred_modalities: Array.isArray(plain?.preferred_modalities)
      ? plain.preferred_modalities.filter(Boolean)
      : [],
    injuries: Array.isArray(plain?.injuries) ? plain.injuries.filter(Boolean) : [],
    equipment: Array.isArray(plain?.equipment) ? plain.equipment.filter(Boolean) : [],
  };
}

router.use(authRequired);

router.get("/me", async (req, res) => {
  try {
    // Try cache first
    const cacheKey = cacheKeys.userProfile(req.user._id.toString());
    const cached = await get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const profile = serializeProfile(req.user.profile);
    
    // Cache for 5 minutes
    await set(cacheKey, profile, 300);
    
    res.json(profile);
  } catch (err) {
    res.json(serializeProfile(req.user.profile));
  }
});

router.put("/me", validate(updateProfileSchema), async (req, res) => {
  const payload = req.body || {};
  const nextProfile = {
    goal: (payload.goal || "").trim(),
    experience_level: ["beginner", "intermediate", "advanced"].includes(
      payload.experience_level
    )
      ? payload.experience_level
      : "beginner",
    preferred_modalities: toArray(payload.preferred_modalities),
    injuries: toArray(payload.injuries),
    equipment: toArray(payload.equipment),
    nutrition_style: (payload.nutrition_style || "").trim(),
    height_cm: toNumber(payload.height_cm),
    weight_kg: toNumber(payload.weight_kg),
    weekly_sessions_target: toNumber(payload.weekly_sessions_target),
    notes: (payload.notes || "").trim(),
  };

  req.user.profile = {
    ...serializeProfile(req.user.profile),
    ...nextProfile,
  };

  await req.user.save();
  
  // Invalidate cache
  const cacheKey = cacheKeys.userProfile(req.user._id.toString());
  await del(cacheKey);
  
  const updatedProfile = serializeProfile(req.user.profile);
  res.json(updatedProfile);
});

export default router;



