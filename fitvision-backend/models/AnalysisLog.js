import mongoose from "mongoose";

const AnalysisLogSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["body_analyze", "plan_generate"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "error"],
      default: "success",
    },
    request_meta: {
      type: Object,
      default: {},
    },
    response_meta: {
      type: Object,
      default: {},
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AnalysisLog = mongoose.model("AnalysisLog", AnalysisLogSchema);




