"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store";

interface Chat {
  _id: string;
  participants: { _id: string; username: string }[];
  lastMessage?: string;
  updatedAt: string;
}

interface ChatListProps {
  userId: string;
}

export default function ChatList({ userId }: ChatListProps) {
  const { activeChatId, setActiveChatId } = useChatStore();
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

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <form onSubmit={handleNewChat} className="flex gap-1">
          <input
            type="text"
            value={newChatUsername}
            onChange={(e) => setNewChatUsername(e.target.value)}
            placeholder="Username..."
            className="flex-1 p-1 text-sm border border-gray-300 dark:border-gray-700 bg-transparent"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-2 py-1 text-sm bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
          >
            +
          </button>
        </form>
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-3 text-sm text-gray-500">Loading...</p>}
        {!loading && chats.length === 0 && (
          <p className="p-3 text-sm text-gray-500">No chats yet</p>
        )}
        {chats.map((chat) => {
          const other = getOtherParticipant(chat);
          const isActive = activeChatId === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => setActiveChatId(chat._id)}
              className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-800 ${
                isActive ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              <p className="font-medium">{other?.username || "Unknown"}</p>
              {chat.lastMessage && (
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
