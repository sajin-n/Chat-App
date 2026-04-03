"use client";

import React, { useState } from "react";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useNotificationStore } from "@/lib/notification-store";

export default function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const { showNotificationCenter, setShowNotificationCenter } = useNotificationStore();
  const {
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications,
  } = useNotifications();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dropdownRef, setDropdownRef] = React.useState<HTMLDivElement | null>(null);

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
    <div className="relative" ref={setDropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowNotificationCenter(!showNotificationCenter)}
        className="relative p-2.5 hover:bg-[#c4b59e]/30 dark:hover:bg-[#393E46] rounded-xl transition-all active:scale-95"
        title="Notifications"
      >
        {/* Bell Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#222831] dark:text-[#DFD0B8]"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotificationCenter && (
        <>
          {/* Overlay for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setShowNotificationCenter(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-[#DFD0B8] dark:bg-[#222831] border border-[#c4b59e] dark:border-[#393E46] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 md:left-auto md:right-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4b59e] dark:border-[#393E46] flex-shrink-0 bg-[#c4b59e]/10 dark:bg-[#393E46]/10">
              <h3 className="font-bold text-[#222831] dark:text-[#DFD0B8]">
                Notifications
              </h3>
              {notifications.length > 0 && (
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46] rounded-lg transition-colors text-[#948979] dark:text-[#948979] hover:text-[#222831] dark:hover:text-[#DFD0B8]"
                      title="Mark all as read"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      clearAllNotifications();
                      setShowNotificationCenter(false);
                    }}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-[#948979] dark:text-[#948979] hover:text-red-600 dark:hover:text-red-400"
                    title="Clear all"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 scroll-container">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="opacity-40 text-[#948979]"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-[#222831] dark:text-[#DFD0B8]">
                      No notifications
                    </p>
                    <p className="text-xs text-[#948979] mt-1">
                      You're all caught up!
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-4 py-3 border-b border-[#c4b59e]/50 dark:border-[#393E46]/50 last:border-b-0 cursor-pointer transition-colors ${
                      !notification.read
                        ? "bg-[#6366f1]/8 dark:bg-[#6366f1]/8 hover:bg-[#6366f1]/12 dark:hover:bg-[#6366f1]/12"
                        : "hover:bg-[#c4b59e]/10 dark:hover:bg-[#393E46]/10"
                    }`}
                    onClick={() => handleNotificationClick(notification._id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 pt-0.5">
                        {notification.type === "message" && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-blue-600 dark:text-blue-400"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                        {notification.type === "comment" && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-amber-600 dark:text-amber-400"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                        {notification.type === "mention" && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-pink-600 dark:text-pink-400"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                          </svg>
                        )}
                        {notification.type === "follow" && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-green-600 dark:text-green-400"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        )}
                        {notification.type === "like" && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-red-600 dark:text-red-400"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        )}
                        {notification.type === "system" && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-gray-600 dark:text-gray-400"
                          >
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm text-[#222831] dark:text-[#DFD0B8] line-clamp-1">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-[#6366f1] flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-[#948979] mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-[#948979] opacity-70 mt-2 block">
                          {formatTime(new Date(notification.createdAt))}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    {expandedId === notification._id && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[#c4b59e]/30 dark:border-[#393E46]/30">
                        {notification.actionUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notification.actionUrl);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg transition-colors"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-[#c4b59e] dark:border-[#393E46] flex-shrink-0 bg-[#c4b59e]/5 dark:bg-[#393E46]/5">
                <button
                  onClick={() => setShowNotificationCenter(false)}
                  className="w-full px-3 py-1.5 text-sm font-medium text-[#222831] dark:text-[#DFD0B8] hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46] rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
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
