"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/lib/notification-store";
import { useChatStore } from "@/lib/store";

export default function ToastPopup() {
  const router = useRouter();
  const { toastNotification, hideToast, markAsRead } = useNotificationStore();
  const { setActiveView, setActiveChatId } = useChatStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (toastNotification) {
      setIsVisible(true);
      setIsAnimatingOut(false);

      const timer = setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => {
          hideToast();
          setIsVisible(false);
        }, 300);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toastNotification, hideToast]);

  const handleClick = () => {
    if (!toastNotification) return;

    if (toastNotification.actionUrl) {
      const actionUrl = toastNotification.actionUrl;

      if (toastNotification.type === "message") {
        const chatId = extractChatId(actionUrl);
        if (chatId) {
          setActiveView("chats");
          setActiveChatId(chatId);
          hideToast();
          setIsVisible(false);
          return;
        }
      }

      if (toastNotification.type === "like" || toastNotification.type === "comment") {
        const blogId = extractBlogId(actionUrl);
        if (blogId) {
          setActiveView("blog");
          hideToast();
          setIsVisible(false);
          return;
        }
      }

      hideToast();
      setIsVisible(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimatingOut(true);
    setTimeout(() => {
      hideToast();
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible && !toastNotification) return null;

  const getIcon = () => {
    switch (toastNotification?.type) {
      case "message":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case "like":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        );
      case "comment":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        );
      case "follow":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        );
      case "mention":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-500">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .toast-enter {
          animation: slideInRight 0.3s ease-out forwards;
        }
        
        .toast-exit {
          animation: slideOutRight 0.3s ease-in forwards;
        }
      `}</style>
      
      <div className="fixed top-4 right-4 z-[200]">
        <div
          onClick={handleClick}
          className={`
            flex items-center gap-3 px-4 py-3 
            bg-white dark:bg-[#222831] 
            border border-[#c4b59e] dark:border-[#393E46]
            rounded-2xl shadow-2xl cursor-pointer
            max-w-sm min-w-[300px]
            hover:shadow-3xl hover:scale-[1.02]
            transition-all duration-200
            ${isAnimatingOut ? "toast-exit" : "toast-enter"}
          `}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#c4b59e]/20 dark:bg-[#393E46]/20 flex items-center justify-center overflow-hidden">
            {toastNotification?.senderAvatar ? (
              <img
                src={toastNotification.senderAvatar}
                alt={toastNotification.senderName || "User"}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              getIcon()
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-[#222831] dark:text-[#DFD0B8] truncate">
              {toastNotification?.title || "New Notification"}
            </h4>
            <p className="text-xs text-[#948979] mt-0.5 line-clamp-1">
              {toastNotification?.message || ""}
            </p>
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46]/20 rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#948979]">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

function extractChatId(url: string): string | null {
  const match = url.match(/\/chats\/([a-f0-9]+)/i);
  return match ? match[1] : null;
}

function extractBlogId(url: string): string | null {
  const match = url.match(/\/blog\/([a-f0-9]+)/i);
  return match ? match[1] : null;
}
