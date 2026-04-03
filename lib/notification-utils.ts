/**
 * Notification utilities for creating and managing notifications
 */

import { Notification } from "@/lib/notification-store";

export interface CreateNotificationParams {
  recipientId: string;
  type: "message" | "comment" | "mention" | "follow" | "like" | "system";
  title: string;
  message: string;
  senderId?: string;
  data?: {
    chatId?: string;
    messageId?: string;
    blogId?: string;
    commentId?: string;
    userId?: string;
  };
  actionUrl?: string;
}

/**
 * Create a new notification via API
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to create notification");
    }

    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create message notification
 */
export function createMessageNotification(
  recipientId: string,
  senderName: string,
  senderId: string,
  messagePreview: string,
  chatId: string,
  messageId: string
) {
  return createNotification({
    recipientId,
    type: "message",
    title: `New message from ${senderName}`,
    message: messagePreview,
    senderId,
    data: { chatId, messageId },
    actionUrl: `/chats?id=${chatId}`,
  });
}

/**
 * Create comment notification
 */
export function createCommentNotification(
  recipientId: string,
  senderName: string,
  senderId: string,
  blogId: string,
  commentId: string,
  commentPreview: string
) {
  return createNotification({
    recipientId,
    type: "comment",
    title: `New comment from ${senderName}`,
    message: commentPreview,
    senderId,
    data: { blogId, commentId },
    actionUrl: `/blog?id=${blogId}`,
  });
}

/**
 * Create mention notification
 */
export function createMentionNotification(
  recipientId: string,
  mentionedByName: string,
  senderId: string,
  context: string,
  actionUrl?: string
) {
  return createNotification({
    recipientId,
    type: "mention",
    title: `${mentionedByName} mentioned you`,
    message: context,
    senderId,
    actionUrl,
  });
}

/**
 * Create follow notification
 */
export function createFollowNotification(
  recipientId: string,
  followerName: string,
  followerId: string
) {
  return createNotification({
    recipientId,
    type: "follow",
    title: `${followerName} followed you`,
    message: "Check out their profile",
    senderId: followerId,
    actionUrl: `/profile/${followerId}`,
  });
}

/**
 * Create like notification
 */
export function createLikeNotification(
  recipientId: string,
  likerName: string,
  likerId: string,
  itemType: "blog" | "comment" | "post",
  itemId: string
) {
  return createNotification({
    recipientId,
    type: "like",
    title: `${likerName} liked your ${itemType}`,
    message: "Check out their reaction",
    senderId: likerId,
    actionUrl: itemType === "blog" ? `/blog?id=${itemId}` : undefined,
  });
}

/**
 * Create system notification
 */
export function createSystemNotification(
  recipientId: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  return createNotification({
    recipientId,
    type: "system",
    title,
    message,
    actionUrl,
  });
}
