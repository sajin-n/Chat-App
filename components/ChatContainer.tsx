"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import GroupList from "@/components/GroupList";
import GroupChatWindow from "@/components/GroupChatWindow";
import BlogFeed from "@/components/BlogFeed";
import BlogSidebar from "@/components/BlogSidebar";
import NotificationBell from "@/components/NotificationBell";
import UserProfile from "@/components/UserProfile";
import UserProfileModal from "@/components/UserProfileModal";
import { ErrorBoundary, ChatErrorFallback } from "@/components/ErrorBoundary";

interface ChatContainerProps {
  userId: string;
}

export default function ChatContainer({ userId }: ChatContainerProps) {
  const { activeView, setActiveView, mobileMenuOpen, setMobileMenuOpen, activeChatId, activeGroupId } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarProfileUserId, setSidebarProfileUserId] = useState<string | null>(null);

  const hasActiveConversation = activeView === "chats" ? !!activeChatId : !!activeGroupId;
  // On mobile, auto-show the sidebar full-screen when no conversation is selected (chats/groups only)
  const autoShowSidebar = !hasActiveConversation && activeView !== "blog";

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
      {/* Mobile overlay - only shown when sidebar is explicitly opened via hamburger (not auto-shown) */}
      {mobileMenuOpen && !autoShowSidebar && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 desktop-hidden transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-full border-r border-[#c4b59e] dark:border-[#393E46] flex flex-col bg-[#DFD0B8] dark:bg-[#222831] z-50
          fixed inset-y-0 left-0 transition-all duration-300 ease-out
          md:relative md:translate-x-0 ${activeView === "blog" ? "md:w-80 lg:w-96" : "md:w-72 lg:w-80"}
          ${mobileMenuOpen || autoShowSidebar ? "translate-x-0" : "-translate-x-full"}
          ${mobileMenuOpen && !autoShowSidebar ? "shadow-2xl" : ""}
        `}
      >
        {/* Tabs - Refined with icons */}
        <div className="flex border-b border-[#c4b59e] dark:border-[#393E46] bg-[#DFD0B8] dark:bg-[#222831] px-1 pt-1">
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
                  ? "text-[#222831] dark:text-[#DFD0B8] bg-[#c4b59e]/30 dark:bg-[#393E46]/50"
                  : "text-[#948979] dark:text-[#948979] hover:text-[#393E46] dark:hover:text-[#DFD0B8] hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46]/30"
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeView === tab.key && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#948979] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className={`flex-1 overflow-hidden ${autoShowSidebar ? "pb-20 md:pb-0" : ""}`}>
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
                onSelectUser={(uid) => setSidebarProfileUserId(uid)}
                onClose={() => setMobileMenuOpen(false)}
              />
            )}
          </ErrorBoundary>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-hidden ${!hasActiveConversation && activeView !== "blog" ? "mobile-hidden md:flex" : ""}`}>
        {/* Header bar */}
        <div className={`shrink-0 px-4 py-2.5 border-b border-[#c4b59e] dark:border-[#393E46] bg-[#DFD0B8]/95 dark:bg-[#222831]/95 backdrop-blur-xl flex items-center justify-between ${activeView !== "blog" ? "hidden md:flex" : ""}`}>
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 hover:bg-[#c4b59e]/30 dark:hover:bg-[#393E46] rounded-xl transition-colors"
              aria-label="Open menu"
              title="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-bold text-lg tracking-tight text-[#222831] dark:text-[#DFD0B8]">
              {activeView === "blog" ? "Blog" : activeView === "groups" ? "Groups" : "Chat"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {currentUser && (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#c4b59e]/30 dark:hover:bg-[#393E46] rounded-xl transition-all active:scale-95"
                title="View profile"
              >
                {currentUser.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-[#c4b59e] dark:ring-[#393E46]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#948979] flex items-center justify-center text-xs text-[#DFD0B8] font-semibold">
                    {currentUser.username?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="font-medium hidden sm:inline text-[#393E46] dark:text-[#DFD0B8]/80">{currentUser.username}</span>
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
          <div className="bg-[#DFD0B8] dark:bg-[#222831] rounded-2xl border border-[#c4b59e] dark:border-[#393E46] w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-[#c4b59e] dark:border-[#393E46] flex items-center justify-between bg-[#c4b59e]/20 dark:bg-[#393E46]/30">
              <h2 className="text-lg font-bold text-[#222831] dark:text-[#DFD0B8]">Profile</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#c4b59e]/40 dark:hover:bg-[#393E46] flex items-center justify-center transition-colors text-[#948979]"
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
            <div className="px-5 py-4 border-t border-[#c4b59e] dark:border-[#393E46] bg-[#c4b59e]/20 dark:bg-[#393E46]/30">
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

      {/* Mobile Sticky Bottom Navigation - shown when no conversation is active (chats/groups only) */}
      {autoShowSidebar && (
        <nav className="fixed bottom-0 inset-x-0 z-60 md:hidden">
          <div className="mx-3 mb-3 rounded-2xl bg-[#DFD0B8]/0 dark:bg-[#222831]/0 backdrop-blur-xl border border-[#c4b59e]/40 dark:border-[#393E46]/40 shadow-[0_4px_24px_rgba(34,40,49,0.1)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-around py-1 px-1">
              {/* Personal Chats */}
              <button
                type="button"
                onClick={() => setActiveView("chats")}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl active:scale-95 transition-all duration-200 ${
                  activeView === "chats"
                    ? "text-[#222831] dark:text-[#DFD0B8] bg-[#c4b59e]/30 dark:bg-[#393E46]/50"
                    : "text-[#948979] dark:text-[#948979] hover:text-[#222831] dark:hover:text-[#DFD0B8] hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46]/30"
                }`}
                aria-label="Personal chats"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-[9px] font-semibold leading-none">Chats</span>
              </button>

              {/* Blog (center) */}
              <button
                type="button"
                onClick={() => setActiveView("blog")}
                className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl relative group active:scale-95 transition-all duration-200"
                aria-label="Blog"
              >
                <div className="w-9 h-9 rounded-full bg-[#393E46] dark:bg-[#DFD0B8] text-[#DFD0B8] dark:text-[#222831] flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span className="text-[9px] font-semibold leading-none text-[#948979] dark:text-[#948979]">Blog</span>
              </button>

              {/* Group Chats */}
              <button
                type="button"
                onClick={() => setActiveView("groups")}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl active:scale-95 transition-all duration-200 ${
                  activeView === "groups"
                    ? "text-[#222831] dark:text-[#DFD0B8] bg-[#c4b59e]/30 dark:bg-[#393E46]/50"
                    : "text-[#948979] dark:text-[#948979] hover:text-[#222831] dark:hover:text-[#DFD0B8] hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46]/30"
                }`}
                aria-label="Group chats"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="text-[9px] font-semibold leading-none">Groups</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* User Profile Modal (from sidebar user search) */}
      <UserProfileModal
        isOpen={!!sidebarProfileUserId}
        userId={sidebarProfileUserId || ""}
        onClose={() => setSidebarProfileUserId(null)}
      />
    </div>
  );
}
