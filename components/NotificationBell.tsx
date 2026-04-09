"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setShowNotificationCenter(false);
      setIsClosing(false);
    }, 200);
  }, [setShowNotificationCenter]);

  const toggleDropdown = useCallback(() => {
    if (showNotificationCenter) {
      closeDropdown();
    } else {
      setShowNotificationCenter(true);
    }
  }, [showNotificationCenter, closeDropdown, setShowNotificationCenter]);

  const handleNotificationClick = useCallback((notificationId: string) => {
    if (!notificationId) return;
    setExpandedId(expandedId === notificationId ? null : notificationId);
    const notification = notifications.find((n) => n._id === notificationId);
    if (notification && !notification.read) {
      markAsRead(notificationId);
    }
  }, [expandedId, notifications, markAsRead]);

  const handleActionClick = useCallback((actionUrl?: string) => {
    if (actionUrl) {
      window.location.href = actionUrl;
    }
    closeDropdown();
  }, [closeDropdown]);

  const NotificationDropdown = () => {
    if (typeof window === "undefined") return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9998]"
        onClick={closeDropdown}
        style={{ touchAction: 'none' }}
      >
        {/* Mobile: Bottom Sheet */}
        <div 
          className={`
            md:hidden fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl
            bg-[#DFD0B8] dark:bg-[#222831] border-t border-[#c4b59e] dark:border-[#393E46]
            flex flex-col overflow-hidden shadow-2xl
            transition-transform duration-300 ease-out
            ${isClosing ? "translate-y-full" : "translate-y-0"}
          `}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            maxHeight: '85vh',
            willChange: 'transform'
          }}
        >
          {/* Mobile Handle */}
          <div className="flex justify-center py-3 flex-shrink-0">
            <div className="w-12 h-1.5 bg-[#c4b59e] dark:bg-[#393E46] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4b59e] dark:border-[#393E46] flex-shrink-0 bg-[#c4b59e]/10 dark:bg-[#393E46]/10">
            <h3 className="font-bold text-[#222831] dark:text-[#DFD0B8] text-lg">
              Notifications
            </h3>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46] rounded-lg transition-colors text-[#948979] dark:text-[#948979]"
                    title="Mark all as read"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    clearAllNotifications();
                    closeDropdown();
                  }}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-[#948979] dark:text-[#948979]"
                  title="Clear all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#c4b59e]/20 dark:bg-[#393E46]/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 text-[#948979]">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-base font-medium text-[#222831] dark:text-[#DFD0B8]">
                  No notifications
                </p>
                <p className="text-sm text-[#948979]">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#c4b59e]/30 dark:divide-[#393E46]/30">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-4 py-4 cursor-pointer transition-colors active:bg-[#c4b59e]/10 dark:active:bg-[#393E46]/10 ${
                      !notification.read
                        ? "bg-[#6366f1]/5 dark:bg-[#6366f1]/5"
                        : ""
                    }`}
                    onClick={() => handleNotificationClick(notification._id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-[#222831] dark:text-[#DFD0B8] line-clamp-1">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1] flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-[#948979] mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-[#948979]/70 mt-2 block">
                          {formatTime(new Date(notification.createdAt))}
                        </span>
                      </div>
                    </div>

                    {expandedId === notification._id && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[#c4b59e]/30 dark:border-[#393E46]/30">
                        {notification.actionUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notification.actionUrl);
                            }}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl transition-colors"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Dropdown Panel */}
        <div 
          className={`
            hidden md:block fixed top-16 right-4 w-96 max-h-[70vh] rounded-2xl
            bg-[#DFD0B8] dark:bg-[#222831] border border-[#c4b59e] dark:border-[#393E46]
            shadow-2xl z-[9999] flex flex-col overflow-hidden
            transition-all duration-200
            ${isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"}
          `}
          onClick={(e) => e.stopPropagation()}
        >
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
                    className="p-1.5 hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46] rounded-lg transition-colors text-[#948979]"
                    title="Mark all as read"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    clearAllNotifications();
                    closeDropdown();
                  }}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-[#948979]"
                  title="Clear all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 text-[#948979]">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#222831] dark:text-[#DFD0B8]">
                    No notifications
                  </p>
                  <p className="text-xs text-[#948979] mt-1">
                    You&apos;re all caught up!
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 border-b border-[#c4b59e]/50 dark:border-[#393E46]/50 last:border-b-0 cursor-pointer transition-colors hover:bg-[#c4b59e]/10 dark:hover:bg-[#393E46]/10 ${
                    !notification.read
                      ? "bg-[#6366f1]/8 dark:bg-[#6366f1]/8"
                      : ""
                  }`}
                  onClick={() => handleNotificationClick(notification._id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 pt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
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
                        className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg transition-colors"
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
                onClick={closeDropdown}
                className="w-full px-3 py-1.5 text-sm font-medium text-[#222831] dark:text-[#DFD0B8] hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46] rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <button
        onClick={toggleDropdown}
        className="relative p-2.5 hover:bg-[#c4b59e]/30 dark:hover:bg-[#393E46] rounded-xl transition-all active:scale-95"
        title="Notifications"
      >
        <svg
          width="22"
          height="22"
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

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {mounted && showNotificationCenter && <NotificationDropdown />}
    </>
  );
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "message":
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 dark:text-blue-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      );
    case "comment":
      return (
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
      );
    case "like":
      return (
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      );
    case "follow":
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
      );
    case "mention":
      return (
        <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-600 dark:text-pink-400">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 dark:text-gray-400">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
      );
  }
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
