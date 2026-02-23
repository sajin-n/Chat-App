"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import GroupList from "@/components/GroupList";
import GroupChatWindow from "@/components/GroupChatWindow";
import BlogFeed from "@/components/BlogFeed";
import BlogSidebar from "@/components/BlogSidebar";
import UserProfile from "@/components/UserProfile";
import { ErrorBoundary, ChatErrorFallback } from "@/components/ErrorBoundary";

interface ChatContainerProps {
  userId: string;
}

export default function ChatContainer({ userId }: ChatContainerProps) {
  const { activeView, setActiveView, mobileMenuOpen, setMobileMenuOpen, activeChatId, activeGroupId } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const hasActiveConversation = activeView === "chats" ? !!activeChatId : !!activeGroupId;

  // Get current user info
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    }
    getCurrentUser();
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 desktop-hidden transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${activeView === "blog" ? "w-full" : "w-72"} lg:w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 z-50
          fixed inset-y-0 left-0 transition-all duration-300 ease-out
          md:relative md:translate-x-0 ${activeView === "blog" ? "md:w-80 lg:w-96" : "md:w-72 lg:w-80"}
          ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        {/* Tabs - Refined with icons */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1 pt-1">
          {[
            { key: "chats" as const, label: "Chats", icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )},
            { key: "groups" as const, label: "Groups", icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )},
            { key: "blog" as const, label: "Blog", icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )},
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`flex-1 py-3 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 rounded-t-xl relative ${
                activeView === tab.key
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeView === tab.key && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary fallback={<ChatErrorFallback />}>
            {activeView === "chats" ? (
              <ChatList userId={userId} />
            ) : activeView === "groups" ? (
              <GroupList userId={userId} />
            ) : (
              <BlogSidebar
                userId={userId}
                onSelectPost={(blogId) => {
                  useChatStore.getState().setTargetBlogId(blogId);
                  setMobileMenuOpen(false);
                }}
                onClose={() => setMobileMenuOpen(false)}
              />
            )}
          </ErrorBoundary>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-hidden ${!hasActiveConversation && activeView !== "blog" ? "mobile-hidden md:flex" : ""}`}>
        {/* Header bar */}
        <div className={`shrink-0 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl flex items-center justify-between ${activeView !== "blog" ? "hidden md:flex" : ""}`}>
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              aria-label="Open menu"
              title="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              {activeView === "blog" ? "Blog" : activeView === "groups" ? "Groups" : "Chat"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
                title="View profile"
              >
                {currentUser.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-semibold">
                    {currentUser.username?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="font-medium hidden sm:inline text-zinc-700 dark:text-zinc-300">{currentUser.username}</span>
              </button>
            )}
          </div>
        </div>

        <ErrorBoundary fallback={<ChatErrorFallback />}>
          {activeView === "blog" ? (
            <BlogFeed userId={userId} />
          ) : activeView === "chats" ? (
            <ChatWindow userId={userId} />
          ) : (
            <GroupChatWindow userId={userId} />
          )}
        </ErrorBoundary>
      </main>

      {/* Profile Modal - Improved */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Profile</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-500"
                title="Close profile"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Profile content */}
            <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
              <UserProfile userId={userId} onClose={() => setShowProfile(false)} />
            </div>
            {/* Footer with logout */}
            <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <button
                onClick={async () => {
                  const { signOut } = await import("next-auth/react");
                  await signOut({ callbackUrl: "/login", redirect: true });
                }}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>
          {/* Backdrop click */}
          <div className="absolute inset-0 z-[-1]" onClick={() => setShowProfile(false)} />
        </div>
      )}

      {/* Mobile: show placeholder when no conversation selected */}
      {!hasActiveConversation && activeView !== "blog" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 desktop-hidden">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium text-sm text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            Open {activeView === "chats" ? "Chats" : "Groups"}
          </button>
        </div>
      )}
    </div>
  );
}
