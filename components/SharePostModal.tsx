"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Chat {
  _id: string;
  participants: { _id: string; username: string }[];
  lastMessage?: string;
}

interface Group {
  _id: string;
  name: string;
  participants: { _id: string; username: string }[];
}

interface BlogPost {
  _id: string;
  content: string;
  imageUrl?: string;
  authorId: { _id: string; username: string; profilePicture?: string };
}

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  blog: BlogPost;
  userId: string;
}

type ShareTab = "chats" | "groups";

export default function SharePostModal({
  isOpen,
  onClose,
  blog,
  userId,
}: SharePostModalProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ShareTab>("chats");
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const [chatsRes, groupsRes] = await Promise.all([
        fetch("/api/chats"),
        fetch("/api/groups"),
      ]);
      if (chatsRes.ok) setChats(await chatsRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      setSent(new Set());
      setSearch("");
      setActiveTab("chats");
    }
  }, [isOpen, fetchConversations]);

  const shareToChat = async (chatId: string, isGroup: boolean) => {
    if (sending || sent.has(chatId)) return;
    setSending(chatId);

    try {
      const shareContent = `📄 Shared a post by @${blog.authorId.username}:\n\n"${blog.content.substring(0, 200)}${blog.content.length > 200 ? "..." : ""}"`;

      const endpoint = isGroup
        ? `/api/groups/${chatId}/messages`
        : `/api/chats/${chatId}/messages`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: shareContent,
          ...(blog.imageUrl ? { imageUrl: blog.imageUrl } : {}),
        }),
      });

      if (res.ok) {
        setSent((prev) => new Set(prev).add(chatId));
      }
    } catch {
      // Ignore
    } finally {
      setSending(null);
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find((p) => p._id !== userId);
  };

  const filteredChats = chats.filter((chat) => {
    if (!search) return true;
    const other = getOtherParticipant(chat);
    return other?.username.toLowerCase().includes(search.toLowerCase());
  });

  const filteredGroups = groups.filter((group) => {
    if (!search) return true;
    return group.name.toLowerCase().includes(search.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md max-h-[80vh] sm:max-h-[70vh] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] sm:animate-[modalIn_0.25s_cubic-bezier(0.16,1,0.3,1)] flex flex-col">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Share Post</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Post Preview */}
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#948979] to-[#7d7466] flex items-center justify-center shrink-0">
              {blog.authorId.profilePicture ? (
                <Image
                  src={blog.authorId.profilePicture}
                  alt=""
                  width={32}
                  height={32}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-white">
                  {blog.authorId.username[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {blog.authorId.username}
              </p>
              <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                {blog.content}
              </p>
            </div>
            {blog.imageUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-700">
                <Image
                  src={blog.imageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 shrink-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#948979] transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-5 shrink-0">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all relative ${
              activeTab === "chats"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            Chats
            {activeTab === "chats" && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#948979] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all relative ${
              activeTab === "groups"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            Groups
            {activeTab === "groups" && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#948979] rounded-full" />
            )}
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-[#948979]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : activeTab === "chats" ? (
            filteredChats.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <p className="text-sm">No chats found</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredChats.map((chat) => {
                  const other = getOtherParticipant(chat);
                  const isSent = sent.has(chat._id);
                  const isSending = sending === chat._id;
                  return (
                    <button
                      key={chat._id}
                      onClick={() => shareToChat(chat._id, false)}
                      disabled={isSending || isSent}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all disabled:opacity-70"
                    >
                      <div className="w-11 h-11 rounded-full bg-linear-to-br from-[#c4b59e] to-[#948979] flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white">
                          {other?.username?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {other?.username || "Unknown"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isSent ? (
                          <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        ) : isSending ? (
                          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <svg className="animate-spin h-4 w-4 text-[#948979]" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#948979]/10 dark:bg-[#948979]/20 flex items-center justify-center group-hover:bg-[#948979]/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#948979] translate-x-px">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">No groups found</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredGroups.map((group) => {
                const isSent = sent.has(group._id);
                const isSending = sending === group._id;
                return (
                  <button
                    key={group._id}
                    onClick={() => shareToChat(group._id, true)}
                    disabled={isSending || isSent}
                    className="w-full px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all disabled:opacity-70"
                  >
                    <div className="w-11 h-11 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {group.participants.length} members
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isSent ? (
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : isSending ? (
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <svg className="animate-spin h-4 w-4 text-[#948979]" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#948979]/10 dark:bg-[#948979]/20 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#948979] translate-x-px">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
