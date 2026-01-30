"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useChatStore } from "@/lib/store";

type MessageStatus = "sending" | "sent" | "failed";

interface Message {
  _id: string;
  content: string;
  senderId: { _id: string; username: string };
  createdAt: string;
  clientId?: string;
  status?: MessageStatus;
}

interface ChatWindowProps {
  userId: string;
}

const MessageBubble = memo(function MessageBubble({
  msg,
  isOwn,
}: {
  msg: Message;
  isOwn: boolean;
}) {
  return (
    <div
      className={`max-w-[70%] p-2 ${
        isOwn
          ? "ml-auto bg-blue-100 dark:bg-blue-900"
          : "mr-auto bg-gray-100 dark:bg-gray-800"
      }`}
      aria-label={`Message from ${msg.senderId.username}`}
    >
      <p className="text-xs text-gray-500 mb-1">{msg.senderId.username}</p>
      <p className="break-all">{msg.content}</p>
      {isOwn && msg.status && (
        <p className="text-xs text-gray-400 text-right mt-1">
          {msg.status === "sending" && "Sending..."}
          {msg.status === "sent" && "✓"}
          {msg.status === "failed" && "Failed - tap to retry"}
        </p>
      )}
    </div>
  );
});

export default function ChatWindow({ userId }: ChatWindowProps) {
  const { activeChatId } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [othersTyping, setOthersTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      setOthersTyping(false);
      return;
    }

    const isInitial = activeChatId !== lastFetchRef.current;
    fetchMessages(activeChatId, isInitial);
    
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
    };
  }, [activeChatId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeChatId) {
      inputRef.current?.focus();
    }
  }, [activeChatId]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChatId || sending) return;

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(activeChatId, false);

    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      _id: clientId,
      content: input.trim(),
      senderId: { _id: userId, username: "You" },
      createdAt: new Date().toISOString(),
      clientId,
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimisticMessage.content, clientId }),
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
  }, [input, activeChatId, sending, userId, sendTypingStatus]);

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
      <div className="flex-1 flex items-center justify-center text-gray-500" role="status">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" role="region" aria-label="Chat messages">
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        aria-label="Message list"
      >
        {loading && messages.length === 0 && (
          <p aria-busy="true">Loading messages...</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-gray-500 text-center">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId._id === userId;
          return (
            <div
              key={msg._id}
              onClick={() => msg.status === "failed" && retryMessage(msg)}
              className={msg.status === "failed" ? "cursor-pointer" : ""}
            >
              <MessageBubble msg={msg} isOwn={isOwn} />
            </div>
          );
        })}
        {othersTyping && (
          <div className="text-gray-500 text-sm italic">
            typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2"
        aria-label="Send message"
      >
        <label htmlFor="message-input" className="sr-only">
          Type a message
        </label>
        <input
          ref={inputRef}
          id="message-input"
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 p-2 border border-gray-300 dark:border-gray-700 bg-transparent"
          aria-describedby="message-hint"
          disabled={sending}
        />
        <span id="message-hint" className="sr-only">
          Press Enter to send
        </span>
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
          aria-label={sending ? "Sending message" : "Send message"}
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
