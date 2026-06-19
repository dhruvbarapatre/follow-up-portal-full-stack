import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
    {
        name: { type: String, required: true },
        phoneNumber: { type: Number, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, default: "user" },
    },
    { timestamps: true }
);

const userModel = mongoose.models.users || mongoose.model("users", UserSchema);
export default userModel;

