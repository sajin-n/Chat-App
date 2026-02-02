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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border)]">
        <form onSubmit={handleNewChat} className="flex gap-2">
          <input
            type="text"
            value={newChatUsername}
            onChange={(e) => setNewChatUsername(e.target.value)}
            placeholder="Start chat with..."
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary btn-icon"
          >
            +
          </button>
        </form>
        {error && <p className="text-[var(--danger)] text-xs mt-1">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <ChatListSkeleton count={5} />}
        {!loading && chats.length === 0 && (
          <p className="p-3 text-sm text-[var(--muted)]">No chats yet</p>
        )}
        {chats.map((chat) => {
          const other = getOtherParticipant(chat);
          const isActive = activeChatId === chat._id;
          const hasUnread = !isActive && (chat.unreadCount ?? 0) > 0;
          return (
            <div
              key={chat._id}
              className={`relative border-b border-[var(--border)] transition-colors ${
                isActive 
                  ? "bg-[var(--border)]" 
                  : hasUnread 
                    ? "bg-[var(--accent)]/10" 
                    : "hover:bg-[var(--border)]/50"
              }`}
            >
              <button
                onClick={() => handleSelectChat(chat._id)}
                className="w-full text-left p-3"
              >
                <div className="flex items-center gap-2">
                  <p className={`font-medium truncate flex-1 ${hasUnread ? "text-[var(--foreground)]" : ""}`}>
                    {other?.username || "Unknown"}
                  </p>
                  {hasUnread && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] text-xs font-medium rounded-full flex items-center justify-center">
                      {chat.unreadCount! > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
                {chat.lastMessage && (
                  <p className={`text-sm truncate ${hasUnread ? "text-[var(--foreground)]/70 font-medium" : "text-[var(--muted)]"}`}>
                    {chat.lastMessage}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
