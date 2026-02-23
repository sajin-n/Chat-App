"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Image from "next/image";
import { CldUploadWidget, CloudinaryUploadWidgetResults } from "next-cloudinary";
import { useChatStore } from "@/lib/store";
import ReportModal from "@/components/ReportModal";
import ConfirmModal from "@/components/ConfirmModal";

type MessageStatus = "sending" | "sent" | "failed";

interface Message {
  _id: string;
  content: string;
  imageUrl?: string;
  senderId: { _id: string; username: string };
  createdAt: string;
  clientId?: string;
  status?: MessageStatus;
  replyTo?: {
    _id: string;
    content: string;
    senderId: { _id: string; username: string };
  };
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
  onReply,
}: {
  msg: Message;
  isOwn: boolean;
  onDelete?: () => void;
  onRetry?: () => void;
  onReply?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Only allow right swipe, max 80px
    setSwipeX(Math.max(0, Math.min(diff, 80)));
  };

  const handleTouchEnd = () => {
    if (swipeX > 50 && onReply) {
      onReply();
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  return (
    <div
      className={`group flex gap-2 mb-1 ${isOwn ? "justify-end" : "justify-start"} animate-[slideUp_0.3s_ease-out]`}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Swipe reply indicator */}
      {swipeX > 0 && (
        <div
          className="flex items-center justify-center w-10 transition-opacity"
          style={{ opacity: swipeX / 80 }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${swipeX > 50 ? 'bg-blue-500 text-white scale-110' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
        </div>
      )}
      <div
        className={`relative px-4 py-2.5 max-w-[75%] rounded-[20px] transition-all duration-200 ${isOwn
          ? "bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-md shadow-blue-500/20"
          : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
          }`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reply preview if message is a reply */}
        {msg.replyTo && (
          <div className={`mb-2 p-2.5 rounded-xl text-xs border-l-[3px] ${isOwn
            ? 'bg-white/15 border-white/40 backdrop-blur-sm'
            : 'bg-zinc-100 dark:bg-zinc-700/50 border-blue-500'}`}>
            <p className={`font-semibold mb-1 ${isOwn ? 'text-white/90' : 'text-blue-600 dark:text-blue-400'}`}>
              {msg.replyTo.senderId?.username || 'Unknown'}
            </p>
            <p className={`line-clamp-2 ${isOwn ? 'text-white/75' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {msg.replyTo.content}
            </p>
          </div>
        )}

        {msg.imageUrl && (
          <Image
            src={msg.imageUrl}
            alt="Message"
            width={300}
            height={250}
            className="w-full rounded-2xl mb-2 max-h-64 object-cover"
          />
        )}
        {msg.content && (
          <p className={`overflow-wrap-break-word text-[15px] leading-relaxed ${isOwn ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'}`}>
            {msg.content}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mt-1">
          <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && msg.status && (
            <span className="text-xs text-white/70">
              {msg.status === "sending" && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {msg.status === "sent" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {msg.status === "failed" && (
                <button onClick={onRetry} className="underline text-red-300">
                  Failed - retry
                </button>
              )}
            </span>
          )}
        </div>

        {/* 3-dot menu button - show for all messages (not just own) */}
        {!msg.status && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`absolute -top-1 ${isOwn ? '-right-1' : '-left-1'} opacity-0 group-hover:opacity-100 transition-all duration-200 w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg text-xs hover:scale-110 active:scale-95`}
            aria-label="Message options"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-600 dark:text-zinc-400">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        )}

        {showMenu && (
          <div className={`absolute top-8 ${isOwn ? 'right-0' : 'left-0'} min-w-35 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xl z-50 rounded-2xl overflow-hidden animate-[scaleIn_0.15s_ease-out] backdrop-blur-xl`}>
            <button
              onClick={() => {
                onReply?.();
                setShowMenu(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                <polyline points="9 14 4 9 9 4" />
                <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
              Reply
            </button>
            {isOwn && onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium border-t border-zinc-100 dark:border-zinc-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            )}
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [clearChatConfirm, setClearChatConfirm] = useState(false);
  const [deleteChatConfirm, setDeleteChatConfirm] = useState(false);

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
    if (!activeChatId) return;

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
    } finally {
      setClearChatConfirm(false);
    }
  }, [activeChatId]);

  const openClearChatConfirm = useCallback(() => {
    setShowMenu(false);
    setClearChatConfirm(true);
  }, []);

  const handleDeleteChat = useCallback(async () => {
    if (!activeChatId) return;

    try {
      const res = await fetch(`/api/chats/${activeChatId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveChatId(null);
      }
    } catch {
      // Ignore
    } finally {
      setDeleteChatConfirm(false);
    }
  }, [activeChatId, setActiveChatId]);

  const openDeleteChatConfirm = useCallback(() => {
    setShowMenu(false);
    setDeleteChatConfirm(true);
  }, []);

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
      replyTo: replyingTo ? {
        _id: replyingTo._id,
        content: replyingTo.content,
        senderId: replyingTo.senderId,
      } : undefined,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setMessageImage(null);
    setReplyingTo(null);
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
          replyToId: optimisticMessage.replyTo?._id,
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
  }, [input, messageImage, activeChatId, sending, userId, sendTypingStatus, replyingTo]);


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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium">Select a chat to start messaging</p>
      </div>
    );
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-linear-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 desktop-hidden"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-base font-bold text-white shadow-lg shadow-blue-500/30">
              {otherUser?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
          </div>
          <div>
            <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{otherUser?.username || "Loading..."}</h2>
            <p className="text-xs text-green-600 dark:text-green-500 font-medium">● Online</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
            aria-label="Chat options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-600 dark:text-zinc-400">
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
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1.5 min-h-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      >
        {loading && messages.length === 0 && (
          <div className="space-y-4">
            {/* Received message skeleton */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="space-y-1">
                <div className="h-16 w-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-bl-md" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              </div>
            </div>
            {/* Sent message skeleton */}
            <div className="flex justify-end">
              <div className="space-y-1 flex flex-col items-end">
                <div className="h-12 w-40 rounded-2xl bg-linear-to-br from-blue-400 to-blue-600 animate-pulse rounded-br-md" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              </div>
            </div>
            {/* Received message skeleton */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="space-y-1">
                <div className="h-20 w-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-bl-md" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              </div>
            </div>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 dark:text-blue-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No messages yet</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Send a message to start the conversation</p>
          </div>
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
              onReply={() => {
                setReplyingTo(msg);
                inputRef.current?.focus();
              }}
            />
          );
        })}
        {othersTyping && (
          <div className="flex gap-2 items-center text-zinc-500 dark:text-zinc-400 text-sm italic pl-2 animate-pulse">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="shrink-0 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center gap-3 animate-[slideDown_0.2s_ease-out]">
          <div className="w-1 h-12 bg-linear-to-b from-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/30" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
              Replying to {replyingTo.senderId.username}
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
              {replyingTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            title="Dismiss reply"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-zinc-700/50 transition-all text-zinc-500 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl"
      >
        {messageImage && (
          <div className="relative max-w-25 animate-[scaleIn_0.2s_ease-out]">
            <Image
              src={messageImage.url}
              alt="Attached"
              width={100}
              height={100}
              className="w-full rounded-2xl shadow-lg border-2 border-zinc-200 dark:border-zinc-700"
            />
            <button
              type="button"
              onClick={() => setMessageImage(null)}
              title="Remove image"
              className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full text-sm hover:bg-red-600 shadow-lg flex items-center justify-center transition-all active:scale-90"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex gap-2.5 items-end">
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
                  title="Attach image"
                  className="w-11 h-11 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-all active:scale-95 shadow-sm"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 dark:text-zinc-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
              )}
            </CldUploadWidget>
          )}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="w-full px-5 py-3.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-[15px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            title="Send message"
            disabled={sending || (!input.trim() && !messageImage)}
            className="w-11 h-11 bg-linear-to-br from-blue-500 to-blue-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center active:scale-95"
          >
            {sending ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="translate-x-px">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Chat Options Modal - Moved to root level and optimized for mobile */}
      {showMenu && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-75 overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-linear-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-800/50">
              <h3 className="font-bold text-center text-base text-zinc-900 dark:text-zinc-100">Chat Options</h3>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={openClearChatConfirm}
                className="w-full px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all flex items-center gap-3.5 text-[15px] text-zinc-700 dark:text-zinc-300 font-medium group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 dark:text-zinc-400">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </div>
                <span>Clear Chat</span>
              </button>
              <button
                onClick={openDeleteChatConfirm}
                className="w-full px-4 py-3.5 text-left hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all flex items-center gap-3.5 text-[15px] text-red-600 dark:text-red-400 font-medium group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <span>Delete Chat</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowReportModal(true);
                }}
                className="w-full px-4 py-3.5 text-left hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all flex items-center gap-3.5 text-[15px] text-red-600 dark:text-red-400 font-medium group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </div>
                <span>Report User</span>
              </button>
            </div>
            <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-3 text-center text-[15px] text-zinc-500 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
          {/* Click backdrop to close */}
          <div className="absolute inset-0 z-[-1]" onClick={() => setShowMenu(false)} />
        </div>
      )}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedType="user"
        reportedId={otherUser?._id || ""}
        reportedName={otherUser?.username}
      />

      {/* Clear Chat Confirmation Modal */}
      <ConfirmModal
        isOpen={clearChatConfirm}
        title="Clear Chat"
        message="Are you sure you want to clear all messages? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleClearChat}
        onCancel={() => setClearChatConfirm(false)}
      />

      {/* Delete Chat Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteChatConfirm}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteChat}
        onCancel={() => setDeleteChatConfirm(false)}
      />
    </div>
  );
}
