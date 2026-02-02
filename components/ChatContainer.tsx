"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import GroupList from "@/components/GroupList";
import GroupChatWindow from "@/components/GroupChatWindow";
import BlogFeed from "@/components/BlogFeed";
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
          className="fixed inset-0 bg-black/50 z-40 desktop-hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-72 border-r border-[var(--border)] flex flex-col bg-[var(--background)] z-50
          fixed inset-y-0 left-0 transition-transform duration-200
          md:relative md:translate-x-0
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          <button
            onClick={() => setActiveView("chats")}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === "chats"
                ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveView("groups")}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === "groups"
                ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveView("blog")}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === "blog"
                ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Blog
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary fallback={<ChatErrorFallback />}>
            {activeView === "chats" ? (
              <ChatList userId={userId} />
            ) : activeView === "groups" ? (
              <GroupList userId={userId} />
            ) : (
              <div className="p-4 text-center text-[var(--muted)] text-sm">
                <p>Browse posts in the main feed</p>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 flex flex-col ${!hasActiveConversation && activeView !== "blog" ? "mobile-hidden md:flex" : ""}`}>
        {/* Header */}
        <div className="p-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="font-bold text-lg tracking-tight md:cursor-default hover:opacity-70 md:hover:opacity-100 transition-opacity"
            >
              Chat
            </button>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                {currentUser.profilePicture ? (
                  <img 
                    src={currentUser.profilePicture} 
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs text-[var(--accent-foreground)] font-medium">
                    {currentUser.username?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="font-medium hidden sm:inline">{currentUser.username}</span>
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

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--background)] rounded-lg border border-[var(--border)] w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold">Profile</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--border)] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-160px)]">
              <UserProfile userId={userId} />
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <form action="/api/auth/signout" method="post">
                <input type="hidden" name="callbackUrl" value="/login" />
                <button
                  type="submit"
                  className="w-full btn btn-danger"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: show placeholder when no conversation selected */}
      {!hasActiveConversation && activeView !== "blog" && (
        <div className="flex-1 flex items-center justify-center text-[var(--muted)] desktop-hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="btn btn-ghost"
          >
            Open {activeView === "chats" ? "Chats" : "Groups"}
          </button>
        </div>
      )}
    </div>
  );
}
