"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { ChatListSkeleton } from "@/components/Skeleton";

interface Chat {
  _id: string;
  participants: { _id: string; username: string }[];
  lastMessage?: string;
  updatedAt: string;
  unreadCount?: number;
}

interface ChatListProps {
  userId: string;
}

export default function ChatList({ userId }: ChatListProps) {
  const { activeChatId, setActiveChatId, setMobileMenuOpen } = useChatStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChatUsername, setNewChatUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        setChats(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  async function handleNewChat(e: React.FormEvent) {
    e.preventDefault();
    if (!newChatUsername.trim() || creating) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newChatUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create chat");
      }

      setNewChatUsername("");
      setActiveChatId(data._id);
      fetchChats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  function getOtherParticipant(chat: Chat) {
    return chat.participants.find((p) => p._id !== userId);
  }

  function handleSelectChat(chatId: string) {
    setActiveChatId(chatId);
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header with New Chat */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleNewChat} className="flex gap-2">
          <input
            type="text"
            value={newChatUsername}
            onChange={(e) => setNewChatUsername(e.target.value)}
            placeholder="Start chat with..."
            className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-10 h-10 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </form>
        {error && (
          <p className="text-red-500 text-xs mt-2 px-1">{error}</p>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading && <ChatListSkeleton count={5} />}
        {!loading && chats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">No chats yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-1">Start a conversation above</p>
          </div>
        )}
        <div className="py-2">
          {chats.map((chat) => {
            const other = getOtherParticipant(chat);
            const isActive = activeChatId === chat._id;
            const hasUnread = !isActive && (chat.unreadCount ?? 0) > 0;
            return (
              <button
                key={chat._id}
                onClick={() => handleSelectChat(chat._id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${isActive
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : hasUnread
                      ? "bg-blue-50 dark:bg-blue-950/20 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${isActive
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300"
                  }`}>
                  {other?.username?.[0]?.toUpperCase() || "?"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium truncate ${hasUnread ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {other?.username || "Unknown"}
                    </p>
                    {hasUnread && (
                      <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                        {chat.unreadCount! > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className={`text-sm truncate mt-0.5 ${hasUnread ? "text-zinc-600 dark:text-zinc-400 font-medium" : "text-zinc-500 dark:text-zinc-500"}`}>
                      {chat.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
