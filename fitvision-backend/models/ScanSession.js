// models/ScanSession.js
import mongoose from "mongoose";

const ScanSessionSchema = new mongoose.Schema(
  {
     // 🔹 user sở hữu lần scan này
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // sau này có thể nâng lên true
    },
    
    filename: String,
    size_kb: Number,

    posture: String,
    weak_muscles: [String],
    fat_area: String,
    score: Number,
    recommendations: [String],
    body_shape: String,
    risk_level: String,
    notes: String,

    // Ảnh Cloudinary
    image_url: {
      type: String,
      required: false,
    },
    
    image_public_id: {
      type: String,
      required: false,
    },

    // lưu luôn toàn bộ plan (object) cho dễ
    plan: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true, // tự có createdAt, updatedAt
  }
);

export const ScanSession = mongoose.model("ScanSession", ScanSessionSchema);
