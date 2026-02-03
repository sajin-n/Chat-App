import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
    _id: mongoose.Types.ObjectId;
    reporterId: mongoose.Types.ObjectId;
    reportedType: "user" | "post" | "comment";
    reportedId: mongoose.Types.ObjectId;
    reason: string;
    description?: string;
    status: "pending" | "resolved";
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedType: {
        type: String,
        enum: ["user", "post", "comment"],
        required: true
    },
    reportedId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    status: {
        type: String,
        enum: ["pending", "resolved"],
        default: "pending"
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reportedType: 1, reportedId: 1 });

export const Report: Model<IReport> =
    mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
