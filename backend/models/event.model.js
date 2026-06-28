const mongoose = require("mongoose");
const { Schema } = mongoose;

const EventSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
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
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const EventModel = mongoose.models.Event || mongoose.model("Event", EventSchema, "events");
module.exports = EventModel;
