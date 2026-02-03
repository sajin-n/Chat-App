import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  imageUrl?: string;
  imagePublicId?: string;
  clientId?: string;
  replyTo?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 2000 },
  imageUrl: { type: String },
  imagePublicId: { type: String },
  clientId: { type: String },
  replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ chatId: 1, clientId: 1 }, { sparse: true });

// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.Message;
}

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
