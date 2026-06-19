import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdmin extends Document {
    name: string;
    phoneNumber: number;
}

const AdminSchema: Schema<IAdmin> = new Schema(
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

const AdminModel: Model<IAdmin> =
    mongoose.models.admins || mongoose.model<IAdmin>("admins", AdminSchema);

export default AdminModel;
