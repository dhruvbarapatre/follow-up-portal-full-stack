const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: Number,
            required: true,
        },
        adderId: {
            type: String,
            required: true,
        },
        chanting: {
            type: Number,
        },
        address: {
            type: String,
        },
        age: {
            type: Number,
        },

        outOfStation: {
            isOutOfStation: {
                type: Boolean,
                default: false,
            },
            isOutOfStationPlace: {
                type: String,
                default: "",
            },
            tillDateOutOfStation: {
                type: String,
            },
            lastTimeAttend: {
                type: Boolean,
            },
            lastTimeNotAttendReason: {
                type: String,
            },
        },

        lastTimeAgreedButNotCome: {
            anyEmergency: {
                type: Boolean,
            },
            lastTimeReason: {
                type: String,
            },
            forgetToCome: {
                type: Boolean,
            },
            isDoingFalsePromise: {
                type: Boolean,
            },
        },

        goodConnectionWith: [
            {
                name: String,
                relation: String,
                phoneNumber: Number,
            },
        ],

        whoCanFollowUp: {
            type: [String],
            default: [],
        },
        isMarried: {
            type: Boolean,
            required: true,
            default: false,
        },
        callingStatus: {
            type: String,
            default: "idle",
        },
        callingBy: {
            type: String,
            default: "",
        },
        callingById: {
            type: String,
            default: "",
        },
        lastCallResponse: {
            type: String,
            default: "pending",
        },
        profession: {
            type: String,
            default: "",
        },
        note: {
            type: String,
            default: "",
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

const CustomerModel = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
module.exports = CustomerModel;
