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
        className={`relative p-3 max-w-[70%] rounded-2xl ${
          isOwn
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
          <p className={`text-xs mt-1 text-right ${
            isOwn ? "opacity-70" : "text-[var(--muted)]"
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
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)] shadow-sm text-xs hover:bg-[var(--border)]"
            aria-label="Message options"
          >
            ⋮
          </button>
        )}

        {showMenu && (
          <div className="absolute -top-1 right-6 bg-[var(--background)] border border-[var(--border)] shadow-lg z-10 rounded-lg overflow-hidden">
            <button
              onClick={() => {
                onDelete?.();
                setShowMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--border)]"
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
  const lastFetchRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="btn btn-icon btn-ghost desktop-hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
          <h2 className="font-semibold">{otherUser?.username || "Loading..."}</h2>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn btn-icon btn-ghost"
            aria-label="Chat options"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[var(--background)] border border-[var(--border)] shadow-lg z-10 min-w-[140px]">
              <button
                onClick={handleClearChat}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--border)]"
              >
                Clear Chat
              </button>
              <button
                onClick={handleDeleteChat}
                className="block w-full px-4 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--border)]"
              >
                Delete Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        className="p-3 border-t border-[var(--border)] space-y-2"
      >
        {messageImage && (
          <div className="relative max-w-[100px]">
            <Image
              src={messageImage.url}
              alt="Attached"
              width={100}
              height={100}
              className="w-full rounded-lg"
            />
            <button
              type="button"
              onClick={() => setMessageImage(null)}
              className="absolute -top-2 -right-2 bg-[var(--danger)] text-white p-1 rounded-full text-xs hover:bg-red-700"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
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
                  className="px-3 py-2 bg-[var(--border)] hover:bg-[var(--border)]/80 rounded-lg text-sm transition-colors"
                >
                  +
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
            className="input flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !messageImage)}
            className="btn btn-primary"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
