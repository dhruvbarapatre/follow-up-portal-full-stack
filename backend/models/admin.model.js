const mongoose = require("mongoose");
const { Schema } = mongoose;

const AdminSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: Number,
            required: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

const AdminModel = mongoose.models.admins || mongoose.model("admins", AdminSchema);
module.exports = AdminModel;
