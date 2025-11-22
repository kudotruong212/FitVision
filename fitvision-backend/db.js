// db.js
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI chưa được cấu hình trong .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // các option hiện phiên bản mới không bắt buộc, để trống cũng được
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connect error:", err.message);
    process.exit(1);
  }
}
