# Notifications Feature Documentation

## Overview

The notifications feature provides real-time notification support for the Giga Chat App. It includes:

- **Database**: MongoDB model for storing notifications
- **State Management**: Zustand store for client-side notification state
- **API Routes**: REST endpoints for CRUD operations
- **UI Components**: NotificationCenter component with notification bell
- **Hooks**: Custom hooks for easy integration
- **Utilities**: Helper functions for creating specific notification types

## Features

✅ Real-time notification updates with polling (30 second intervals)
✅ Read/unread notification status tracking
✅ 6 notification types: message, comment, mention, follow, like, system
✅ Notification details, timestamps, and action URLs
✅ Bulk read/delete operations
✅ Responsive mobile design
✅ Notification badge with unread count

## Database Schema

The `Notification` model includes:

```typescript
{
  _id: ObjectId
  recipientId: ObjectId (indexed)
  senderId?: ObjectId
  type: "message" | "comment" | "mention" | "follow" | "like" | "system"
  title: string (max 100 chars)
  message: string (max 500 chars)
  data?: {
    chatId?: string
    messageId?: string
    blogId?: string
    commentId?: string
    userId?: string
  }
  read: boolean (indexed)
  readAt?: Date
  actionUrl?: string
  createdAt: Date (indexed)
  updatedAt: Date
}
```

## API Endpoints

### GET /api/notifications
Fetch notifications for the authenticated user.

**Query Parameters:**
- `skip` (optional, default: 0) - Number of notifications to skip
- `limit` (optional, default: 20) - Number of notifications to return
- `unreadOnly` (optional) - If "true", only return unread notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "total": 150,
    "unreadCount": 5,
    "hasMore": true
  }
}
```

### POST /api/notifications
Create a new notification (typically called from the backend).

**Request Body:**
```json
{
  "recipientId": "user_id",
  "type": "message",
  "title": "New message from John",
  "message": "Hey, how are you?",
  "senderId": "sender_id",
  "data": {
    "chatId": "chat_id",
    "messageId": "message_id"
  },
  "actionUrl": "/chats?id=chat_id"
}
```

### PATCH /api/notifications/:notificationId
Mark a notification as read or update its status.

**Request Body:**
```json
{
  "read": true
}
```

### DELETE /api/notifications/:notificationId
Delete a specific notification.

### PATCH /api/notifications/clear
Mark all notifications as read.

### DELETE /api/notifications/clear
Delete all notifications.

## Usage Guide

### 1. Using the Notification Hook

```typescript
import { useNotifications } from "@/lib/hooks/use-notifications";

function MyComponent() {
  const {
    notifications,      // Array of notifications
    unreadCount,       // Number of unread notifications
    loading,           // Loading state
    fetchNotifications, // Manual fetch function
    markAsRead,        // Mark single notification as read
    markAllAsRead,     // Mark all as read
    deleteNotification, // Delete single notification
    clearAllNotifications, // Delete all
    createNotification, // Create new notification
  } = useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {notifications.map(n => (
        <div key={n._id}>
          <h4>{n.title}</h4>
          <p>{n.message}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Creating Notifications

#### Using Utility Functions

```typescript
import {
  createMessageNotification,
  createCommentNotification,
  createMentionNotification,
  createFollowNotification,
  createLikeNotification,
  createSystemNotification,
} from "@/lib/notification-utils";

// Message notification
await createMessageNotification(
  recipientId,
  "John Doe",
  senderId,
  "Hey, how are you?",
  chatId,
  messageId
);

// Comment notification
await createCommentNotification(
  recipientId,
  "Jane Smith",
  senderId,
  blogId,
  commentId,
  "Great post!"
);

// Mention notification
await createMentionNotification(
  recipientId,
  "John Doe",
  senderId,
  "Check out this cool thing @Jane mentioned you"
);

// Follow notification
await createFollowNotification(
  recipientId,
  "John Doe",
  senderId
);

// Like notification
await createLikeNotification(
  recipientId,
  "Jane Smith",
  senderId,
  "blog",
  blogId
);

// System notification
await createSystemNotification(
  recipientId,
  "Welcome!",
  "Thanks for joining our chat app"
);
```

#### Direct API Call

```typescript
const response = await fetch("/api/notifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    recipientId: "user_id",
    type: "message",
    title: "New message",
    message: "Hello there!",
    senderId: "sender_id",
    actionUrl: "/chats?id=chat_id"
  })
});
```

### 3. Integrating with Message Routes

In your message creation API (`/api/chats/[chatId]/messages`):

```typescript
import { createMessageNotification } from "@/lib/notification-utils";

// After saving message
for (const participantId of chat.participants) {
  if (participantId.toString() !== userId) {
    await createMessageNotification(
      participantId,
      userProfile.username,
      userId,
      message.content.substring(0, 100),
      chatId,
      message._id.toString()
    );
  }
}
```

### 4. Integrating with Comments

In your comment creation API:

```typescript
import { createCommentNotification } from "@/lib/notification-utils";

// After saving comment
if (blog.createdBy.toString() !== userId) {
  await createCommentNotification(
    blog.createdBy,
    userProfile.username,
    userId,
    blogId,
    comment._id.toString(),
    comment.content.substring(0, 100)
  );
}
```

### 5. Accessing Notification Center on the UI

The NotificationCenter component is automatically included in the Providers component. It displays:

- Bell icon with unread count badge
- Dropdown panel with all notifications
- Ability to expand/collapse notifications
- Action buttons (View, Delete)
- Mark all as read / Clear all buttons

```typescript
// Already included in Providers.tsx
// Just use it in your app - no additional setup needed
```

## State Management

The notification store (`useNotificationStore`) manages:

- `notifications` - Array of notification objects
- `unreadCount` - Count of unread notifications
- `loading` - Loading state for API calls
- `showNotificationCenter` - Whether the notification panel is open

Access any store state:

```typescript
import { useNotificationStore } from "@/lib/notification-store";

const notifications = useNotificationStore(s => s.notifications);
const unreadCount = useNotificationStore(s => s.unreadCount);
const setShowNotificationCenter = useNotificationStore(
  s => s.setShowNotificationCenter
);
```

## Styling

All notification styles are in `app/globals.css` under the `/* ===== Notification Center ===== */` section.

Key CSS classes:
- `.notification-bell` - Bell icon button
- `.notification-center` - Main notification panel
- `.notification-item` - Individual notification
- `.notification-item.unread` - Unread notification styling
- `.notification-badge` - Unread count badge

Customize colors by modifying these classes or CSS variables.

## Polling Configuration

Notifications are auto-fetched every 30 seconds. To change this:

**File**: `lib/hooks/use-notifications.ts`

```typescript
// Change this value (in milliseconds)
pollingIntervalRef.current = setInterval(() => {
  fetchNotifications();
}, 30000); // 30 seconds
```

## Best Practices

1. **Always include senderId** when a user is the notification source
2. **Use actionUrl** to navigate users to relevant content
3. **Keep message short** (max 500 chars) for better display
4. **Batch operations** when marking multiple as read/deleted
5. **Handle errors gracefully** - notifications are non-critical
6. **Test with mobile** - notifications are responsive
7. **Avoid duplicate notifications** - check before creating
8. **Clean old notifications** periodically using a background job

## Example Integration: Chat Messages

```typescript
// In ChatWindow component
import { useNotifications } from "@/lib/hooks/use-notifications";

export default function ChatWindow() {
  const { createNotification } = useNotifications();

  const sendMessage = async (content: string) => {
    // ... save message to DB ...
    
    // Notify other participants
    await createNotification({
      recipientId: otherUserId,
      type: "message",
      title: `New message from ${currentUser.username}`,
      message: content.substring(0, 100),
      senderId: currentUser.id,
      data: { chatId, messageId },
      actionUrl: `/chats?id=${chatId}`
    });
  };
}
```

## Example Integration: Blog Comments

```typescript
// In BlogFeed component
import { createCommentNotification } from "@/lib/notification-utils";

const handleAddComment = async (blogId: string, content: string) => {
  // ... save comment to DB ...
  
  // Notify blog author
  const blog = await getBlog(blogId);
  await createCommentNotification(
    blog.createdBy,
    currentUser.username,
    currentUser.id,
    blogId,
    commentId,
    content.substring(0, 100)
  );
};
```

## Troubleshooting

**Notifications not appearing?**
- Check that notifications are enabled in user preferences
- Verify user is authenticated (check session)
- Check browser console for API errors
- Ensure polling interval is not too long

**Notifications duplicating?**
- Check for duplicate API calls when creating notifications
- Ensure idempotent notification creation

**Performance issues?**
- Increase polling interval if too many API calls
- Implement notification deletion for old notifications
- Index MongoDB queries (already done in schema)

## Future Enhancements

- [ ] Email notifications
- [ ] Push notifications (Web Push API)
- [ ] Notification preferences/settings
- [ ] Notification grouping by type
- [ ] Sound alerts
- [ ] Notification scheduling (quiet hours)
- [ ] WebSocket real-time updates (instead of polling)
- [ ] Notification categories and filtering
- [ ] Notification read receipts
