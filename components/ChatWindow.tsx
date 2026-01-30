"use client";

import { useState, useEffect, useRef } from "react";
import { useChatStore } from "@/lib/store";

interface Message {
  _id: string;
  content: string;
  senderId: { _id: string; username: string };
  createdAt: string;
}

interface ChatWindowProps {
  userId: string;
}

export default function ChatWindow({ userId }: ChatWindowProps) {
  const { activeChatId } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      if (activeChatId === lastFetchRef.current && messages.length > 0) {
        const res = await fetch(`/api/chats/${activeChatId}/messages?limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (JSON.stringify(data) !== JSON.stringify(messages)) {
            setMessages(data);
          }
        }
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/chats/${activeChatId}/messages?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          lastFetchRef.current = activeChatId;
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [activeChatId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeChatId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  if (!activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a chat
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && messages.length === 0 && <p>Loading...</p>}
        {messages.map((msg) => {
          const isOwn = msg.senderId._id === userId;
          return (
            <div
              key={msg._id}
              className={`max-w-[70%] p-2 ${
                isOwn
                  ? "ml-auto bg-blue-100 dark:bg-blue-900"
                  : "mr-auto bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">
                {msg.senderId.username}
              </p>
              <p className="break-words">{msg.content}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border border-gray-300 dark:border-gray-700 bg-transparent"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
