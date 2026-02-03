"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Image from "next/image";
import { CldUploadWidget, CloudinaryUploadWidgetResults } from "next-cloudinary";
import { useChatStore } from "@/lib/store";

type MessageStatus = "sending" | "sent" | "failed";

interface Message {
  _id: string;
  content: string;
  imageUrl?: string;
  senderId: { _id: string; username: string };
  createdAt: string;
  clientId?: string;
  status?: MessageStatus;
}

interface Chat {
  _id: string;
  participants: { _id: string; username: string }[];
}

interface ChatWindowProps {
  userId: string;
}

const MessageBubble = memo(function MessageBubble({
  msg,
  isOwn,
  onDelete,
  onRetry,
}: {
  msg: Message;
  isOwn: boolean;
  onDelete?: () => void;
  onRetry?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group flex ${isOwn ? "justify-end" : "justify-start"}`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div
        className={`relative p-3 max-w-[70%] rounded-2xl ${isOwn
          ? "bg-[var(--accent)] text-[var(--accent-foreground)] rounded-br-md"
          : "bg-[var(--border)] rounded-bl-md"
          }`}
      >
        {msg.imageUrl && (
          <Image
            src={msg.imageUrl}
            alt="Message"
            width={300}
            height={250}
            className="w-full rounded-lg mb-2 max-h-64 object-cover"
          />
        )}
        {msg.content && (
          <p className="break-words text-sm leading-relaxed">{msg.content}</p>
        )}

        {isOwn && msg.status && (
          <p className={`text-xs mt-1 text-right ${isOwn ? "opacity-70" : "text-[var(--muted)]"
            }`}>
            {msg.status === "sending" && "Sending..."}
            {msg.status === "sent" && "✓"}
            {msg.status === "failed" && (
              <button onClick={onRetry} className="underline">
                Failed - tap to retry
              </button>
            )}
          </p>
        )}

        {isOwn && !msg.status && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all duration-150 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-md text-xs hover:scale-110"
            aria-label="Message options"
          >
            ⋮
          </button>
        )}

        {showMenu && (
          <div className="absolute -top-1 right-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl z-10 rounded-xl overflow-hidden animate-[scaleIn_0.15s_ease-out]">
            <button
              onClick={() => {
                onDelete?.();
                setShowMenu(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function ChatWindow({ userId }: ChatWindowProps) {
  const { activeChatId, setActiveChatId, setMobileMenuOpen } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [input, setInput] = useState("");
  const [messageImage, setMessageImage] = useState<{ url: string; publicId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [othersTyping, setOthersTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const getOtherParticipant = useCallback(() => {
    return chat?.participants.find((p) => p._id !== userId);
  }, [chat, userId]);

  const fetchChat = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (res.ok) {
        setChat(await res.json());
      }
    } catch {
      // Ignore
    }
  }, []);

  const sendTypingStatus = useCallback(async (chatId: string, isTyping: boolean) => {
    try {
      await fetch(`/api/chats/${chatId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping }),
      });
    } catch {
      // Ignore typing status errors
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (activeChatId && e.target.value.trim()) {
      sendTypingStatus(activeChatId, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (activeChatId) {
          sendTypingStatus(activeChatId, false);
        }
      }, 2000);
    } else if (activeChatId) {
      // Clear typing status when input is empty
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTypingStatus(activeChatId, false);
    }
  }, [activeChatId, sendTypingStatus]);

  const fetchMessages = useCallback(async (chatId: string, isInitial: boolean) => {
    if (isInitial) setLoading(true);

    try {
      const res = await fetch(`/api/chats/${chatId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const serverMessages = data.messages || data;
          // Merge with pending messages
          const pendingMessages = prev.filter(
            (m) => m.status === "sending" || m.status === "failed"
          );
          return [...serverMessages, ...pendingMessages];
        });
        lastFetchRef.current = chatId;
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setChat(null);
      setOthersTyping(false);
      return;
    }

    const isInitial = activeChatId !== lastFetchRef.current;
    fetchMessages(activeChatId, isInitial);
    fetchChat(activeChatId);

    const messageInterval = setInterval(() => {
      fetchMessages(activeChatId, false);
    }, 2000);

    const fetchTypingStatus = async () => {
      try {
        const res = await fetch(`/api/chats/${activeChatId}/typing`);
        if (res.ok) {
          const data = await res.json();
          setOthersTyping(data.typing.length > 0);
        }
      } catch {
        // Ignore typing status errors
      }
    };

    fetchTypingStatus();
    const typingInterval = setInterval(fetchTypingStatus, 1500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(typingInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [activeChatId, fetchMessages, fetchChat]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
    }
  }, []);

  // Only auto-scroll if user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (activeChatId) {
      inputRef.current?.focus();
    }
  }, [activeChatId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!activeChatId) return;

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages/${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch {
      // Ignore
    }
  }, [activeChatId]);

  const handleClearChat = useCallback(async () => {
    if (!activeChatId || !confirm("Clear all messages?")) return;

    try {
      const res = await fetch(`/api/chats/${activeChatId}/clear`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages([]);
        setShowMenu(false);
      }
    } catch {
      // Ignore
    }
  }, [activeChatId]);

  const handleDeleteChat = useCallback(async () => {
    if (!activeChatId || !confirm("Delete this conversation?")) return;

    try {
      const res = await fetch(`/api/chats/${activeChatId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveChatId(null);
      }
    } catch {
      // Ignore
    }
  }, [activeChatId, setActiveChatId]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !messageImage) || !activeChatId || sending) return;

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(activeChatId, false);

    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const optimisticMessage: Message = {
      _id: clientId,
      content: input.trim(),
      imageUrl: messageImage?.url,
      senderId: { _id: userId, username: "You" },
      createdAt: new Date().toISOString(),
      clientId,
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setMessageImage(null);
    setSending(true);

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: optimisticMessage.content,
          imageUrl: messageImage?.url,
          imagePublicId: messageImage?.publicId,
          clientId,
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === clientId ? { ...newMessage, status: "sent" as const } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === clientId ? { ...m, status: "failed" as const } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: "failed" as const } : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [input, messageImage, activeChatId, sending, userId, sendTypingStatus]);


  const retryMessage = useCallback(async (msg: Message) => {
    if (msg.status !== "failed" || !activeChatId) return;

    setMessages((prev) =>
      prev.map((m) =>
        m._id === msg._id ? { ...m, status: "sending" as const } : m
      )
    );

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg.content, clientId: msg.clientId }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg._id ? { ...newMessage, status: "sent" as const } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg._id ? { ...m, status: "failed" as const } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? { ...m, status: "failed" as const } : m
        )
      );
    }
  }, [activeChatId]);

  if (!activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors desktop-hidden"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            {otherUser?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{otherUser?.username || "Loading..."}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Online</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Chat options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>


        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading && messages.length === 0 && (
          <div className="space-y-4">
            {/* Received message skeleton */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="space-y-1">
                <div className="h-16 w-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              </div>
            </div>
            {/* Sent message skeleton */}
            <div className="flex justify-end">
              <div className="space-y-1 flex flex-col items-end">
                <div className="h-12 w-40 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              </div>
            </div>
            {/* Received message skeleton */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="space-y-1">
                <div className="h-20 w-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              </div>
            </div>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-[var(--muted)] text-center">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId._id === userId;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isOwn={isOwn}
              onDelete={isOwn && !msg.status ? () => handleDeleteMessage(msg._id) : undefined}
              onRetry={msg.status === "failed" ? () => retryMessage(msg) : undefined}
            />
          );
        })}
        {othersTyping && (
          <div className="text-[var(--muted)] text-sm italic">
            typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
      >
        {messageImage && (
          <div className="relative max-w-[100px]">
            <Image
              src={messageImage.url}
              alt="Attached"
              width={100}
              height={100}
              className="w-full rounded-xl shadow-sm"
            />
            <button
              type="button"
              onClick={() => setMessageImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm hover:bg-red-600 shadow-md flex items-center justify-center"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-3">
          {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
            <CldUploadWidget
              uploadPreset="giga_chat"
              onSuccess={(result: CloudinaryUploadWidgetResults) => {
                if (result.info && typeof result.info === "object" && "secure_url" in result.info && "public_id" in result.info) {
                  setMessageImage({
                    url: result.info.secure_url,
                    publicId: result.info.public_id,
                  });
                }
              }}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="w-11 h-11 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
              )}
            </CldUploadWidget>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !messageImage)}
            className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Chat Options Modal - Moved to root level and optimized for mobile */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[280px] overflow-hidden animate-[scaleIn_0.15s_ease-out] border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold text-center text-sm text-zinc-900 dark:text-zinc-100">Chat Options</h3>
            </div>
            <div className="p-1 space-y-0.5">
              <button
                onClick={handleClearChat}
                className="w-full px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 font-medium"
              >
                <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </div>
                Clear Chat
              </button>
              <button
                onClick={handleDeleteChat}
                className="w-full px-3 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-3 text-sm text-red-600 dark:text-red-400 font-medium"
              >
                <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </div>
                Delete Chat
              </button>
            </div>
            <div className="p-1 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-2.5 text-center text-sm text-zinc-500 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          {/* Click backdrop to close */}
          <div className="absolute inset-0 z-[-1]" onClick={() => setShowMenu(false)} />
        </div>
      )}
    </div>
  );
}
