// models/Exercise.js
import mongoose from "mongoose";

const ExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },          // Tên bài tập
    slug: { type: String, required: true, unique: true },

    muscle_group: { type: String, required: true },  // ví dụ: "chest", "back", "legs", "core", "shoulders"
    level: { type: String, default: "beginner" },    // beginner | intermediate | advanced

    equipment: { type: String, default: "bodyweight" }, // bodyweight, dumbbell, machine, barbell
    type: { type: String, default: "strength" },        // strength, mobility, cardio

    thumbnail_url: { type: String, default: "" },   // dùng link ảnh / cloudinary
    video_url: { type: String, default: "" },       // sau này có thể là link demo

    // mô tả & cue chi tiết
    description: { type: String, default: "" },
    cues: { type: [String], default: [] },          // ví dụ: ["Giữ lưng thẳng", "Siết core"]

    // sau này để gắn Three.js
    three_model: { type: String, default: "" },     // path file .glb/.gltf nếu có
  },
  { timestamps: true }
);

export const Exercise = mongoose.model("Exercise", ExerciseSchema);
