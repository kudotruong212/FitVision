// models/ScanSession.js
import mongoose from "mongoose";

const ScanSessionSchema = new mongoose.Schema(
  {
    // sau này có userId thì thêm vào
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
