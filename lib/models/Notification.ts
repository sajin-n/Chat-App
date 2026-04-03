import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType = 
  | "message" 
  | "comment" 
  | "mention" 
  | "follow" 
  | "like"
  | "system";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    chatId?: string;
    messageId?: string;
    blogId?: string;
    commentId?: string;
    userId?: string;
  };
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  senderId: { 
    type: Schema.Types.ObjectId, 
    ref: "User" 
  },
  type: { 
    type: String, 
    enum: ["message", "comment", "mention", "follow", "like", "system"],
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 100 
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 500 
  },
  data: {
    chatId: String,
    messageId: String,
    blogId: String,
    commentId: String,
    userId: String,
  },
  read: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  readAt: { 
    type: Date 
  },
  actionUrl: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Compound index for efficient queries
NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || 
  mongoose.model<INotification>("Notification", NotificationSchema);
