// models/User.js
import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    goal: {
      type: String,
      trim: true,
      default: "",
    },
    experience_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    preferred_modalities: {
      type: [String],
      default: [],
    },
    injuries: {
      type: [String],
      default: [],
    },
    equipment: {
      type: [String],
      default: [],
    },
    nutrition_style: {
      type: String,
      trim: true,
      default: "",
    },
    height_cm: {
      type: Number,
      default: null,
    },
    weight_kg: {
      type: Number,
      default: null,
    },
    weekly_sessions_target: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
{
        name: {
            type: String,
            required: false,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        email_verified: {
            type: Boolean,
            default: false,
        },
        password_hash: {
            type: String,
            required: true,
        },
        scanQuota: {
            date: String,
            count: {
                type: Number,
                default: 0,
            },
            max: {
                type: Number,
                default: 20,
            },
        },
    profile: {
      type: ProfileSchema,
      default: () => ({}),
    },
        // sau này thêm role, avatar, v.v. cũng được
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", UserSchema);
