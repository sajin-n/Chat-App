/**
 * Example integrations for notifications feature
 * Copy these patterns to your existing components/routes
 */

// ============================================
// EXAMPLE 1: Send Message Notification
// ============================================
// File: app/api/chats/[chatId]/messages/route.ts

/*
import { createMessageNotification } from "@/lib/notification-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse(null, "Unauthorized", 401);

    const { chatId } = await params;
    const { content, image } = await req.json();
    
    // ... existing message creation logic ...
    
    // Get chat and other participants
    const chat = await Chat.findById(chatId).populate("participants");
    if (!chat) return apiResponse(null, "Chat not found", 404);
    
    // Get sender's profile for name
    const sender = await User.findById(session.user.id);
    
    // Notify each participant (except sender)
    for (const participant of chat.participants) {
      if (participant._id.toString() !== session.user.id) {
        try {
          await createMessageNotification(
            participant._id.toString(),
            sender?.username || "Unknown User",
            session.user.id,
            content.substring(0, 100),
            chatId,
            message._id.toString()
          );
        } catch (error) {
          console.error("Failed to send notification:", error);
          // Don't fail the message send if notification fails
        }
      }
    }
    
    return apiResponse(message, "Message sent successfully", 201);
  } catch (error) {
    console.error("[MESSAGE_POST]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 2: Send Comment Notification
// ============================================
// File: app/api/blogs/[blogId]/comments/route.ts

/*
import { createCommentNotification } from "@/lib/notification-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse(null, "Unauthorized", 401);

    const { blogId } = await params;
    const { content } = await req.json();
    
    // ... existing comment creation logic ...
    
    // Get blog
    const blog = await Blog.findById(blogId);
    if (!blog) return apiResponse(null, "Blog not found", 404);
    
    // Get commenter's profile
    const commenter = await User.findById(session.user.id);
    
    // Notify blog author (if not the commenter)
    if (blog.createdBy.toString() !== session.user.id) {
      try {
        await createCommentNotification(
          blog.createdBy.toString(),
          commenter?.username || "Unknown User",
          session.user.id,
          blogId,
          comment._id.toString(),
          content.substring(0, 100)
        );
      } catch (error) {
        console.error("Failed to send notification:", error);
      }
    }
    
    return apiResponse(comment, "Comment created successfully", 201);
  } catch (error) {
    console.error("[COMMENT_POST]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 3: Group Message Notification
// ============================================
// File: app/api/groups/[groupId]/messages/route.ts

/*
import { createMessageNotification } from "@/lib/notification-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse(null, "Unauthorized", 401);

    const { groupId } = await params;
    const { content, image } = await req.json();
    
    // ... existing message creation logic ...
    
    const group = await Group.findById(groupId).populate("members");
    if (!group) return apiResponse(null, "Group not found", 404);
    
    const sender = await User.findById(session.user.id);
    
    // Notify all group members except sender
    for (const member of group.members) {
      if (member._id.toString() !== session.user.id) {
        try {
          await createMessageNotification(
            member._id.toString(),
            sender?.username || "Unknown User",
            session.user.id,
            content.substring(0, 100) || "[Image/Media]",
            groupId,
            message._id.toString()
          );
        } catch (error) {
          console.error("Failed to send notification:", error);
        }
      }
    }
    
    return apiResponse(message, "Message sent successfully", 201);
  } catch (error) {
    console.error("[GROUP_MESSAGE_POST]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 4: Follow/Friend Request Notification
// ============================================
// File: app/api/users/[userId]/follow/route.ts

/*
import { createFollowNotification } from "@/lib/notification-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse(null, "Unauthorized", 401);

    const { userId } = await params;
    
    // ... existing follow logic ...
    
    const follower = await User.findById(session.user.id);
    
    // Notify the followed user
    try {
      await createFollowNotification(
        userId,
        follower?.username || "Unknown User",
        session.user.id
      );
    } catch (error) {
      console.error("Failed to send follow notification:", error);
    }
    
    return apiResponse(null, "User followed successfully", 200);
  } catch (error) {
    console.error("[FOLLOW_POST]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 5: Like Notification
// ============================================
// File: app/api/blogs/[blogId]/like/route.ts

/*
import { createLikeNotification } from "@/lib/notification-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse(null, "Unauthorized", 401);

    const { blogId } = await params;
    
    // ... existing like logic ...
    
    const blog = await Blog.findById(blogId);
    if (!blog) return apiResponse(null, "Blog not found", 404);
    
    const liker = await User.findById(session.user.id);
    
    // Notify blog author (if not the liker)
    if (blog.createdBy.toString() !== session.user.id) {
      try {
        await createLikeNotification(
          blog.createdBy.toString(),
          liker?.username || "Unknown User",
          session.user.id,
          "blog",
          blogId
        );
      } catch (error) {
        console.error("Failed to send like notification:", error);
      }
    }
    
    return apiResponse(null, "Blog liked successfully", 200);
  } catch (error) {
    console.error("[LIKE_POST]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 6: Mention Notification (in chat)
// ============================================
// File: app/api/chats/[chatId]/messages/route.ts (updated)

/*
import { 
  createMessageNotification,
  createMentionNotification 
} from "@/lib/notification-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse(null, "Unauthorized", 401);

    const { chatId } = await params;
    const { content, image } = await req.json();
    
    // ... existing message creation logic ...
    
    const chat = await Chat.findById(chatId).populate("participants");
    const sender = await User.findById(session.user.id);
    
    // Find mentions (@username pattern)
    const mentionPattern = /@(\w+)/g;
    const mentions = content.match(mentionPattern) || [];
    
    // Notify each participant
    for (const participant of chat.participants) {
      if (participant._id.toString() !== session.user.id) {
        // Check if this user was mentioned
        const isMentioned = mentions.some(
          mention => 
            mention.toLowerCase() === `@${participant.username.toLowerCase()}`
        );
        
        if (isMentioned) {
          // Send mention notification
          try {
            await createMentionNotification(
              participant._id.toString(),
              sender?.username || "Unknown User",
              session.user.id,
              `${sender?.username} mentioned you: ${content.substring(0, 80)}`,
              `/chats?id=${chatId}`
            );
          } catch (error) {
            console.error("Failed to send mention notification:", error);
          }
        } else {
          // Send regular message notification
          try {
            await createMessageNotification(
              participant._id.toString(),
              sender?.username || "Unknown User",
              session.user.id,
              content.substring(0, 100),
              chatId,
              message._id.toString()
            );
          } catch (error) {
            console.error("Failed to send notification:", error);
          }
        }
      }
    }
    
    return apiResponse(message, "Message sent successfully", 201);
  } catch (error) {
    console.error("[MESSAGE_POST]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 7: System Notification (Admin)
// ============================================
// File: app/api/admin/notifications/broadcast/route.ts

/*
import { createSystemNotification } from "@/lib/notification-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    // Check if user is admin
    if (!session?.user?.email || !session.user.email.includes('@admin')) {
      return apiResponse(null, "Unauthorized", 401);
    }

    const { title, message, targetUserIds } = await req.json();
    
    // Send to specific users or all users
    let userIds = targetUserIds;
    if (!userIds || userIds.length === 0) {
      const allUsers = await User.find({}, "_id");
      userIds = allUsers.map(u => u._id.toString());
    }
    
    // Send notifications
    const results = await Promise.allSettled(
      userIds.map(userId =>
        createSystemNotification(userId, title, message)
      )
    );
    
    const successful = results.filter(r => r.status === "fulfilled").length;
    
    return apiResponse(
      { successful, failed: results.length - successful },
      `Sent ${successful} notifications`,
      200
    );
  } catch (error) {
    console.error("[BROADCAST_NOTIFICATION]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
*/

// ============================================
// EXAMPLE 8: Using notifications in a component
// ============================================
// File: components/ChatWindow.tsx (updated)

/*
"use client";

import { useNotifications } from "@/lib/hooks/use-notifications";

export default function ChatWindow() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    createNotification
  } = useNotifications();
  
  // Filter notifications for current chat
  const chatNotifications = notifications.filter(
    n => n.type === "message" && n.data?.chatId === activeChatId
  );

  const sendMessage = async (content: string) => {
    // ... existing message send logic ...
    
    // Message is sent and API creates notifications
    // Component automatically updates via polling
  };

  return (
    <div>
      {/* Show notification indicator */}
      {unreadCount > 0 && (
        <div className="unread-indicator">
          {unreadCount} unread notifications
        </div>
      )}
      
      {/* Chat messages */}
      {/* ... */}
    </div>
  );
}
*/

export const NOTIFICATION_EXAMPLES = {
  message: "Send notification when user receives a message",
  comment: "Send notification when someone comments on a post",
  mention: "Send notification when user is @mentioned",
  follow: "Send notification when someone follows the user",
  like: "Send notification when someone likes content",
  system: "Send system announcements or admin notifications"
};
