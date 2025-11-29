import mongoose from "mongoose";

const CoachMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const CoachThreadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    messages: {
      type: [CoachMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const CoachThread = mongoose.model("CoachThread", CoachThreadSchema);


