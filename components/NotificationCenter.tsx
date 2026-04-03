"use client";

import React, { useState } from "react";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useNotificationStore } from "@/lib/notification-store";

const notificationIcons = {
  message: "💬",
  comment: "💭",
  mention: "@️",
  follow: "🤝",
  like: "❤️",
  system: "🔔",
};

const notificationColors = {
  message: "#6366f1",
  comment: "#f59e0b",
  mention: "#ec4899",
  follow: "#10b981",
  like: "#ef4444",
  system: "#6b7280",
};

export default function NotificationCenter() {
  const { notifications, unreadCount } = useNotifications();
  const { showNotificationCenter, setShowNotificationCenter } = useNotificationStore();
  const {
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications,
  } = useNotifications();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unreadNotifications = notifications.filter((n) => !n.read);

  const handleNotificationClick = (notificationId: string) => {
    if (!notificationId) return;
    setExpandedId(expandedId === notificationId ? null : notificationId);
    const notification = notifications.find((n) => n._id === notificationId);
    if (notification && !notification.read) {
      markAsRead(notificationId);
    }
  };

  const handleActionClick = (actionUrl?: string) => {
    if (actionUrl) {
      window.location.href = actionUrl;
      setShowNotificationCenter(false);
    }
  };

  return (
    <>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setShowNotificationCenter(!showNotificationCenter)}
        className="notification-bell"
        title="Notifications"
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Notification Center Dropdown */}
      {showNotificationCenter && (
        <div className="notification-center">
          {/* Header */}
          <div className="notification-header">
            <h3 className="notification-title">Notifications</h3>
            {notifications.length > 0 && (
              <div className="notification-header-actions">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="notification-btn-small"
                    title="Mark all as read"
                  >
                    ✓
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearAllNotifications();
                      setShowNotificationCenter(false);
                    }}
                    className="notification-btn-small danger"
                    title="Clear all"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="notification-empty-icon">📭</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.read ? "unread" : ""} ${
                    expandedId === notification._id ? "expanded" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification._id)}
                >
                  <div className="notification-item-header">
                    <div className="notification-item-left">
                      <span className="notification-item-icon">
                        {notificationIcons[notification.type]}
                      </span>
                      <div className="notification-item-content">
                        <h4 className="notification-item-title">{notification.title}</h4>
                        {expandedId === notification._id && (
                          <p className="notification-item-message">{notification.message}</p>
                        )}
                        <span className="notification-item-time">
                          {formatTime(new Date(notification.createdAt))}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <span className="notification-item-dot"></span>
                    )}
                  </div>

                  {/* Expanded Actions */}
                  {expandedId === notification._id && (
                    <div className="notification-item-actions">
                      {notification.actionUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(notification.actionUrl);
                          }}
                          className="notification-action-btn primary"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="notification-action-btn danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                onClick={() => {
                  setShowNotificationCenter(false);
                }}
                className="notification-btn-secondary"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      {showNotificationCenter && (
        <div
          className="notification-overlay"
          onClick={() => setShowNotificationCenter(false)}
        />
      )}
    </>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
