const mongoose = require("mongoose");
const { Schema } = mongoose;

const AttendanceSchema = new Schema(
    {
        eventId: {
            type: Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },
        status: {
            type: String,
            default: "invited",
        },
        response: {
            type: String,
            default: "pending",
        },
        callingBy: {
            type: String,
            default: "",
        },
        attended: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Explicitly use "attendance" for the collection name
const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema, "attendance");
module.exports = Attendance;
