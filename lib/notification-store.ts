import { create } from "zustand";

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: string;
  type: "message" | "comment" | "mention" | "follow" | "like" | "system";
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

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  showNotificationCenter: boolean;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setShowNotificationCenter: (show: boolean) => void;
  updateUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  showNotificationCenter: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => {
      const exists = state.notifications.find((n) => n._id === notification._id);
      if (exists) return state;

      const newNotifications = [notification, ...state.notifications].slice(0, 100);
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };
    }),

  removeNotification: (notificationId) =>
    set((state) => {
      const newNotifications = state.notifications.filter(
        (n) => n._id !== notificationId
      );
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (notificationId) =>
    set((state) => {
      const newNotifications = state.notifications.map((n) =>
        n._id === notificationId ? { ...n, read: true, readAt: new Date() } : n
      );
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => {
      const newNotifications = state.notifications.map((n) => ({
        ...n,
        read: true,
        readAt: new Date(),
      }));
      return {
        notifications: newNotifications,
        unreadCount: 0,
      };
    }),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  setLoading: (loading) => set({ loading }),
  setShowNotificationCenter: (show) => set({ showNotificationCenter: show }),
  updateUnreadCount: (count) => set({ unreadCount: count }),
}));
