import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  name?: string;
  isGroup: boolean;
  participants: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastReadBy: Map<string, Date>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>({
  name: { type: String, maxlength: 50 },
  isGroup: { type: Boolean, default: false },
  participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
  admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  lastReadBy: { type: Map, of: Date, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ChatSchema.index({ participants: 1 });
ChatSchema.index({ isGroup: 1, participants: 1 });

export const Chat: Model<IChat> =
  mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
