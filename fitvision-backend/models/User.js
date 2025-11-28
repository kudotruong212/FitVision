// models/User.js
import mongoose from "mongoose";

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
        password_hash: {
            type: String,
            required: true,
        },
        // sau này thêm role, avatar, v.v. cũng được
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", UserSchema);
