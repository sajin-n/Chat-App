"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { ChatListSkeleton } from "@/components/Skeleton";
import UserProfileModal from "@/components/UserProfileModal";

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
  const [deletedUserChatId, setDeletedUserChatId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

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
    const chat = chats.find((c) => c._id === chatId);
    const other = chat ? getOtherParticipant(chat) : null;

    if (!other) {
      setDeletedUserChatId(chatId);
      return;
    }

    setActiveChatId(chatId);
    setMobileMenuOpen(false);
  }

  async function confirmDeleteChat() {
    if (!deletedUserChatId) return;

    try {
      await fetch(`/api/chats/${deletedUserChatId}`, {
        method: "DELETE",
      });
      setChats((prev) => prev.filter((c) => c._id !== deletedUserChatId));
      if (activeChatId === deletedUserChatId) {
        setActiveChatId(null);
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    } finally {
      setDeletedUserChatId(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-[#DFD0B8] to-[#d4c5a8] dark:from-[#222831] dark:to-[#1c2028]">
      {/* Header with New Chat */}
      <div className="p-4 border-b border-[#c4b59e] dark:border-[#393E46] bg-[#DFD0B8]/80 dark:bg-[#222831]/80 backdrop-blur-sm">
        <form onSubmit={handleNewChat} className="flex gap-0 items-center bg-[#c4b59e]/30 dark:bg-[#393E46] rounded-2xl pr-1.5 focus-within:ring-2 focus-within:ring-[#948979] transition-all">
          <input
            type="text"
            value={newChatUsername}
            onChange={(e) => setNewChatUsername(e.target.value)}
            placeholder="Start chat with..."
            className="flex-1 px-4 py-3 bg-transparent border-0 rounded-2xl text-sm focus:outline-none placeholder:text-[#948979] dark:placeholder:text-[#948979]/70"
          />
          <button
            type="submit"
            disabled={creating || !newChatUsername.trim()}
            title="Start new chat"
            className="w-9 h-9 flex items-center justify-center bg-[#948979] text-[#DFD0B8] rounded-xl hover:bg-[#7d7466] disabled:opacity-0 disabled:scale-75 transition-all duration-200 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>
        {error && (
          <p className="text-red-500 text-xs mt-2 px-1 animate-[slideDown_0.2s_ease-out]">{error}</p>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading && <ChatListSkeleton count={5} />}
        {!loading && chats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#c4b59e]/40 to-[#c4b59e]/60 dark:from-[#393E46] dark:to-[#393E46]/60 flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#948979] dark:text-[#DFD0B8]/60">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-[#948979] dark:text-[#948979] text-center font-medium">No chats yet</p>
            <p className="text-xs text-[#948979]/70 dark:text-[#948979]/60 text-center mt-1">Start a conversation above</p>
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
                className={`w-full text-left px-4 py-3.5 flex items-center gap-3.5 transition-all relative overflow-hidden group ${isActive
                  ? "bg-linear-to-r from-[#c4b59e]/30 to-[#c4b59e]/50 dark:from-[#393E46]/50 dark:to-[#393E46]/30 border-l-4 border-[#948979]"
                  : hasUnread
                    ? "bg-[#c4b59e]/10 dark:bg-[#393E46]/20 hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46]/30 border-l-4 border-transparent"
                    : "hover:bg-[#c4b59e]/15 dark:hover:bg-[#393E46]/30 border-l-4 border-transparent"
                  }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-linear-to-r from-[#948979]/10 to-transparent pointer-events-none"></div>
                )}
                
                {/* Avatar */}
                <div
                  className="relative shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (other?._id) setProfileUserId(other._id);
                  }}
                  title={`View ${other?.username || 'user'}'s profile`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shadow-md transition-all ${isActive
                    ? "bg-linear-to-br from-[#948979] to-[#7d7466] text-[#DFD0B8] shadow-[#948979]/30 scale-105"
                    : "bg-linear-to-br from-[#c4b59e]/50 to-[#c4b59e]/70 dark:from-[#393E46] dark:to-[#4a5060] text-[#393E46] dark:text-[#DFD0B8]/80 group-hover:scale-105"
                    }`}>
                    {other?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  {hasUnread && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#948979] rounded-full border-2 border-[#DFD0B8] dark:border-[#222831] animate-pulse"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`font-semibold truncate text-[15px] ${hasUnread || isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {other?.username || "Unknown User"}
                    </p>
                    {hasUnread && (
                      <span className="shrink-0 min-w-6 h-6 px-2 bg-[#948979] text-[#DFD0B8] text-xs font-bold rounded-full flex items-center justify-center shadow-md shadow-[#948979]/30 animate-[scaleIn_0.2s_ease-out]">
                        {chat.unreadCount! > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className={`text-sm truncate ${hasUnread ? "text-zinc-700 dark:text-zinc-300 font-medium" : "text-zinc-500 dark:text-zinc-500"}`}>
                      {chat.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {/* Deleted User Modal */}
      {deletedUserChatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#DFD0B8] dark:bg-[#222831] rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-[scaleIn_0.2s_ease-out] border border-[#c4b59e] dark:border-[#393E46]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 dark:text-red-400">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#222831] dark:text-[#DFD0B8]">
                User Deleted
              </h3>
            </div>
            <p className="text-[#393E46] dark:text-[#948979] mb-6 leading-relaxed">
              This user has deleted their account. By clicking OK, this chat will be removed from your list.
            </p>
            <div className="flex justify-end">
              <button
                onClick={confirmDeleteChat}
                className="w-full sm:w-auto px-8 py-3 bg-linear-to-r from-[#948979] to-[#7d7466] text-[#DFD0B8] rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#948979]/30 transition-all shadow-md active:scale-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!profileUserId}
        userId={profileUserId || ""}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
