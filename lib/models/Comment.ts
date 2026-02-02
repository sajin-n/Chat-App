import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  blogId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  blogId: { type: Schema.Types.ObjectId, ref: "Blog", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 500 },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CommentSchema.index({ blogId: 1, createdAt: -1 });

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);
