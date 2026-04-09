import { useCallback, useEffect, useRef } from "react";
import { useNotificationStore, type Notification } from "@/lib/notification-store";
import { useSession } from "next-auth/react";

export function useNotifications() {
  const { data: session, status } = useSession();
  const {
    notifications,
    unreadCount,
    loading,
    setNotifications,
    setLoading,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    updateUnreadCount,
    showToast,
  } = useNotificationStore();

  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastFetchedIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef(true);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        skip: "0",
        limit: "50",
        ...(unreadOnly && { unreadOnly: "true" }),
      });

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");

      const json = await response.json();
      const newNotifications = json.data.notifications;

      if (isInitialFetchRef.current) {
        setNotifications(newNotifications);
        lastFetchedIdsRef.current = new Set(newNotifications.map((n: Notification) => n._id));
        isInitialFetchRef.current = false;
      } else {
        const newIds = newNotifications
          .filter((n: Notification) => !lastFetchedIdsRef.current.has(n._id))
          .filter((n: Notification) => !n.read);

        if (newIds.length > 0) {
          const latestNotification = newIds[0];
          showToast({
            id: latestNotification._id,
            type: latestNotification.type,
            title: latestNotification.title,
            message: latestNotification.message,
            actionUrl: latestNotification.actionUrl,
          });
        }

        setNotifications(newNotifications);
        lastFetchedIdsRef.current = new Set(newNotifications.map((n: Notification) => n._id));
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, setNotifications, setLoading, showToast]);

  const markAsReadHandler = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });

        if (!response.ok) throw new Error("Failed to mark as read");

        markAsRead(notificationId);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [markAsRead]
  );

  const markAllAsReadHandler = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/clear", {
        method: "PATCH",
      });

      if (!response.ok) throw new Error("Failed to mark all as read");

      markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [markAllAsRead]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete notification");

        removeNotification(notificationId);
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    },
    [removeNotification]
  );

  const clearAllNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/clear", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to clear notifications");

      clearNotifications();
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  }, [clearNotifications]);

  const createNotification = useCallback(
    async (notificationData: Omit<Notification, "_id" | "createdAt" | "updatedAt">) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notificationData),
        });

        if (!response.ok) throw new Error("Failed to create notification");

        const json = await response.json();
        addNotification(json.data);
      } catch (error) {
        console.error("Failed to create notification:", error);
      }
    },
    [addNotification]
  );

  // Initial fetch and polling
  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();

      // Poll for new notifications every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications();
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [status, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead: markAsReadHandler,
    markAllAsRead: markAllAsReadHandler,
    deleteNotification,
    clearAllNotifications,
    createNotification,
  };
}

export function useCreateNotification() {
  return useNotificationStore((state) => state.addNotification);
}
