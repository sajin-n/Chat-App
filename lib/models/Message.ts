import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  imageUrl?: string;
  imagePublicId?: string;
  clientId?: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 2000 },
  imageUrl: { type: String },
  imagePublicId: { type: String },
  clientId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ chatId: 1, clientId: 1 }, { sparse: true });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
