const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        phoneNumber: { type: Number, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, default: "user" },
    },
    { timestamps: true }
);

const UserModel = mongoose.models.users || mongoose.model("users", UserSchema);
module.exports = UserModel;
