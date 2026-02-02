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

interface Group {
  _id: string;
  name: string;
  participants: { _id: string; username: string }[];
  admins: { _id: string; username: string }[];
  createdBy: { _id: string; username: string };
}

interface GroupChatWindowProps {
  userId: string;
}

const MessageBubble = memo(function MessageBubble({
  msg,
  isOwn,
  onDelete,
}: {
  msg: Message;
  isOwn: boolean;
  onDelete?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group flex ${isOwn ? "justify-end" : "justify-start"} animate-[slideUp_0.2s_ease-out]`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div
        className={`relative px-3.5 py-2.5 max-w-[75%] rounded-xl transition-all duration-200 ${
          isOwn
            ? "bg-[var(--foreground)] text-[var(--background)] rounded-br-sm"
            : "bg-[var(--foreground)]/[0.06] border border-[var(--border)]/40 rounded-bl-sm"
        }`}
      >
        {!isOwn && (
          <p className="text-[10px] font-medium text-[var(--foreground)]/50 mb-1.5 tracking-wide uppercase">
            {msg.senderId.username}
          </p>
        )}
        <p className="break-words text-[13px] leading-relaxed">{msg.content}</p>
        
        {isOwn && msg.status && (
          <p className={`text-[10px] mt-1.5 text-right tracking-wide ${
            isOwn ? "opacity-60" : "text-[var(--muted)]"
          }`}>
            {msg.status === "sending" && "···"}
            {msg.status === "sent" && "✓"}
            {msg.status === "failed" && "✗"}
          </p>
        )}

        {isOwn && !msg.status && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)]/60 shadow-sm text-[10px] hover:bg-[var(--foreground)]/[0.04] hover:scale-110"
            aria-label="Message options"
          >
            ⋮
          </button>
        )}

        {showMenu && (
          <div className="absolute -top-1 right-5 bg-[var(--background)] border border-[var(--border)]/60 shadow-lg z-10 rounded-lg overflow-hidden animate-[fadeIn_0.1s_ease-out]">
            <button
              onClick={() => {
                onDelete?.();
                setShowMenu(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs text-[var(--danger)] hover:bg-[var(--foreground)]/[0.03] transition-colors duration-150"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function GroupChatWindow({ userId }: GroupChatWindowProps) {
  const { activeGroupId, setActiveGroupId, setMobileMenuOpen } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = group?.admins.some((a) => a._id === userId) ?? false;
  const isCreator = group?.createdBy._id === userId;

  const fetchGroup = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data);
        setEditName(data.name);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchMessages = useCallback(async (groupId: string, isInitial: boolean) => {
    if (isInitial) setLoading(true);
    
    try {
      const res = await fetch(`/api/groups/${groupId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const serverMessages = data.messages || data;
          const pendingMessages = prev.filter(
            (m) => m.status === "sending" || m.status === "failed"
          );
          return [...serverMessages, ...pendingMessages];
        });
        lastFetchRef.current = groupId;
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeGroupId) {
      setMessages([]);
      setGroup(null);
      return;
    }

    const isInitial = activeGroupId !== lastFetchRef.current;
    fetchMessages(activeGroupId, isInitial);
    fetchGroup(activeGroupId);
    
    const interval = setInterval(() => {
      fetchMessages(activeGroupId, false);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activeGroupId, fetchMessages, fetchGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeGroupId) {
      inputRef.current?.focus();
    }
  }, [activeGroupId]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeGroupId || sending) return;

    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
      const res = await fetch(`/api/groups/${activeGroupId}/messages`, {
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
  }, [input, activeGroupId, sending, userId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/messages/${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch {
      // Ignore
    }
  }, [activeGroupId]);

  const handleUpdateGroup = useCallback(async () => {
    if (!activeGroupId || !editName.trim()) return;
    
    setUpdateError("");

    try {
      const res = await fetch(`/api/groups/${activeGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
        setShowSettings(false);
      } else {
        setUpdateError(data.error || "Failed to update group");
      }
    } catch (error) {
      setUpdateError("Error updating group");
    }
  }, [activeGroupId, editName]);

  const handleAddMember = useCallback(async () => {
    if (!activeGroupId || !addUsername.trim()) return;
    
    setAddError("");

    try {
      const res = await fetch(`/api/groups/${activeGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addUsernames: [addUsername.trim()] }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
        setAddUsername("");
        setAddError("");
      } else {
        setAddError(data.error || "Failed to add member");
      }
    } catch (error) {
      setAddError("Error adding member");
    }
  }, [activeGroupId, addUsername]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeUserIds: [memberId] }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroup(data);
      }
    } catch {
      // Ignore
    }
  }, [activeGroupId]);

  const handleDeleteGroup = useCallback(async () => {
    if (!activeGroupId || !confirm("Delete this group?")) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveGroupId(null);
      }
    } catch {
      // Ignore
    }
  }, [activeGroupId, setActiveGroupId]);

  if (!activeGroupId) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
        <p>Select a group to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]/40 flex items-center justify-between backdrop-blur-sm bg-[var(--background)]/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-colors duration-150 desktop-hidden"
            aria-label="Open menu"
          >
            <span className="text-sm">☰</span>
          </button>
          <div>
            <h2 className="font-semibold text-sm">{group?.name || "Loading..."}</h2>
            <p className="text-[10px] text-[var(--muted)] tracking-wide">
              {group?.participants.length} members
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-colors duration-150"
          aria-label="Group settings"
        >
          <span className="text-sm">⚙</span>
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && group && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]" 
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-[var(--background)] border border-[var(--border)]/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/40">
              <h3 className="font-semibold text-sm">Group Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.06] transition-colors duration-150 text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[70vh]">
              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Group Name</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          setUpdateError("");
                        }}
                        placeholder="Group name"
                        className="flex-1 px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)]/60 rounded-lg focus:outline-none focus:border-[var(--border)] transition-colors duration-150"
                      />
                      <button 
                        onClick={handleUpdateGroup} 
                        className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-lg hover:opacity-90 transition-opacity duration-150"
                      >
                        Save
                      </button>
                    </div>
                    {updateError && (
                      <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg border border-[var(--danger)]/20 flex items-center gap-2">
                        <span className="text-sm leading-none">⚠</span>
                        {updateError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Add Member</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addUsername}
                        onChange={(e) => {
                          setAddUsername(e.target.value);
                          setAddError("");
                        }}
                        placeholder="Username"
                        className="flex-1 px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)]/60 rounded-lg focus:outline-none focus:border-[var(--border)] transition-colors duration-150"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddMember();
                          }
                        }}
                      />
                      <button 
                        onClick={handleAddMember} 
                        className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-lg hover:opacity-90 transition-opacity duration-150"
                      >
                        Add
                      </button>
                    </div>
                    {addError && (
                      <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg border border-[var(--danger)]/20 flex items-center gap-2">
                        <span className="text-sm leading-none">⚠</span>
                        {addError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">
                  Members ({group.participants.length})
                </label>
                <div className="space-y-0.5 bg-[var(--foreground)]/[0.02] border border-[var(--border)]/30 rounded-xl p-2">
                  {group.participants.map((p) => (
                    <div 
                      key={p._id} 
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-colors duration-150"
                    >
                      <span className="text-[13px]">
                        {p.username}
                        {group.admins.some((a) => a._id === p._id) && (
                          <span className="text-[10px] text-[var(--foreground)]/50 ml-1.5 font-medium uppercase tracking-wide">(admin)</span>
                        )}
                        {group.createdBy._id === p._id && (
                          <span className="text-[10px] text-[var(--muted)] ml-1.5 font-medium uppercase tracking-wide">(owner)</span>
                        )}
                      </span>
                      {isAdmin && p._id !== userId && p._id !== group.createdBy._id && (
                        <button
                          onClick={() => handleRemoveMember(p._id)}
                          className="text-[11px] text-[var(--danger)] hover:underline transition-all duration-150"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isCreator && (
                <button 
                  onClick={handleDeleteGroup} 
                  className="w-full px-4 py-2.5 bg-[var(--danger)]/10 text-[var(--danger)] text-sm font-medium rounded-lg hover:bg-[var(--danger)]/20 transition-colors duration-150 border border-[var(--danger)]/20"
                >
                  Delete Group
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && messages.length === 0 && (
          <div className="space-y-3">
            {/* Received message skeleton */}
            <div className="flex gap-2">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-[var(--foreground)]/[0.06] animate-pulse rounded" />
                <div className="h-16 w-52 rounded-xl bg-[var(--foreground)]/[0.06] animate-pulse rounded-bl-sm" />
              </div>
            </div>
            {/* Sent message skeleton */}
            <div className="flex justify-end">
              <div className="h-14 w-44 rounded-xl bg-[var(--foreground)]/[0.08] animate-pulse rounded-br-sm" />
            </div>
            {/* Received message skeleton */}
            <div className="flex gap-2">
              <div className="space-y-1">
                <div className="h-2.5 w-20 bg-[var(--foreground)]/[0.06] animate-pulse rounded" />
                <div className="h-20 w-60 rounded-xl bg-[var(--foreground)]/[0.06] animate-pulse rounded-bl-sm" />
              </div>
            </div>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-[var(--muted)] text-center text-sm">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId._id === userId;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isOwn={isOwn}
              onDelete={isOwn && !msg.status ? () => handleDeleteMessage(msg._id) : undefined}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-[var(--border)]/40 flex gap-2 backdrop-blur-sm bg-[var(--background)]/80"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 text-sm bg-[var(--background)] border border-[var(--border)]/60 rounded-lg focus:outline-none focus:border-[var(--border)] transition-colors duration-150 placeholder:text-[var(--muted)]"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-5 py-2.5 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          {sending ? "···" : "Send"}
        </button>
      </form>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}