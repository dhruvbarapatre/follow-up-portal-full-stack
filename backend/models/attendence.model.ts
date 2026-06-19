import mongoose from "mongoose";

const { Schema } = mongoose;

const AttendanceSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        date: {
            type: Date,
            required: true,
            unique: true,
            index: true,
        },

        time: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        users: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        invitedCustomers: [
            {
                customerId: {
                    type: Schema.Types.ObjectId,
                    ref: "Customer",
                    required: true,
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
        ],
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Attendance =
    mongoose.models.Attendance ||
    mongoose.model("Attendance", AttendanceSchema);

export default Attendance;
