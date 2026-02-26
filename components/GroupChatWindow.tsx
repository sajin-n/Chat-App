"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Image from "next/image";
import { useChatStore } from "@/lib/store";
import ConfirmModal from "@/components/ConfirmModal";
import { useUploadThing } from "@/lib/uploadthing";
import UserProfileModal from "@/components/UserProfileModal";

type MessageStatus = "sending" | "sent" | "failed";

interface Message {
  _id: string;
  content: string;
  senderId: { _id: string; username: string };
  createdAt: string;
  clientId?: string;
  status?: MessageStatus;
  imageUrl?: string;
  replyTo?: {
    _id: string;
    content: string;
    senderId: { _id: string; username: string };
  };
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
  onReply,
  onImageClick,
  onMemberClick,
}: {
  msg: Message;
  isOwn: boolean;
  onDelete?: () => void;
  onReply?: () => void;
  onImageClick?: (url: string) => void;
  onMemberClick?: (userId: string) => void;
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
    setSwipeX(Math.max(0, Math.min(diff, 80)));
  };

  const handleTouchEnd = () => {
    if (swipeX > 50 && onReply) {
      onReply();
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
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${swipeX > 50 ? 'bg-[#948979] text-white scale-110' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
        </div>
      )}
      <div
        className={`relative px-4 py-2.5 max-w-[75%] rounded-2xl transition-all duration-200 ${isOwn
          ? "bg-linear-to-br from-[#948979] to-[#7d7466] text-white rounded-br-md shadow-md shadow-[#948979]/20"
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
            : 'bg-zinc-100 dark:bg-zinc-700/50 border-[#948979]'}`}>
            <p className={`font-semibold mb-1 ${isOwn ? 'text-white/90' : 'text-[#948979] dark:text-[#DFD0B8]/70'}`}>
              {msg.replyTo.senderId?.username || 'Unknown'}
            </p>
            <p className={`line-clamp-2 ${isOwn ? 'text-white/75' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {msg.replyTo.content}
            </p>
          </div>
        )}

        {!isOwn && (
          <button
            onClick={() => onMemberClick?.(msg.senderId._id)}
            className="text-[11px] font-bold mb-1.5 text-[#948979] dark:text-[#DFD0B8]/70 tracking-wide uppercase hover:underline cursor-pointer"
            title={`View ${msg.senderId.username}'s profile`}
          >
            {msg.senderId.username}
          </button>
        )}
        {msg.imageUrl && (
          <button
            type="button"
            onClick={() => onImageClick?.(msg.imageUrl!)}
            className="my-1 block cursor-zoom-in rounded-lg overflow-hidden"
          >
            <Image
              src={msg.imageUrl}
              alt="Shared image"
              width={300}
              height={300}
              className="rounded-lg max-w-[260px] h-auto object-contain"
              unoptimized
            />
          </button>
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
              {msg.status === "failed" && "✗"}
            </span>
          )}
        </div>

        {/* 3-dot menu button */}
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
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-[#c4b59e]/20 dark:hover:bg-[#393E46]/30 transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#948979] dark:text-[#DFD0B8]/70">
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


export default function GroupChatWindow({ userId }: GroupChatWindowProps) {
  const { activeGroupId, setActiveGroupId } = useChatStore();
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [messageImage, setMessageImage] = useState<{ url: string; publicId?: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("chatFileUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        setMessageImage({ url: res[0].ufsUrl, publicId: res[0].key });
      }
      setIsUploading(false);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      setIsUploading(false);
    },
  });

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
      setMessageImage(null);
      setReplyingTo(null);
      setInput("");
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
    if (activeGroupId) {
      inputRef.current?.focus();
    }
  }, [activeGroupId]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    const currentImage = messageImage;
    if ((!trimmedInput && !currentImage) || !activeGroupId || sending) return;

    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const optimisticMessage: Message = {
      _id: clientId,
      content: trimmedInput,
      senderId: { _id: userId, username: "You" },
      createdAt: new Date().toISOString(),
      clientId,
      status: "sending",
      imageUrl: currentImage?.url,
      replyTo: replyingTo ? {
        _id: replyingTo._id,
        content: replyingTo.content,
        senderId: replyingTo.senderId,
      } : undefined,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setReplyingTo(null);
    setMessageImage(null);
    setSending(true);

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedInput,
          clientId,
          replyToId: optimisticMessage.replyTo?._id,
          ...(currentImage && { imageUrl: currentImage.url, imagePublicId: currentImage.publicId }),
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
  }, [input, activeGroupId, sending, userId, replyingTo, messageImage]);

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
    } catch {
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
    } catch {
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
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveGroupId(null);
      }
    } catch {
      // Ignore
    } finally {
      setDeleteGroupConfirm(false);
    }
  }, [activeGroupId, setActiveGroupId]);

  const openDeleteGroupConfirm = useCallback(() => {
    setDeleteGroupConfirm(true);
  }, []);

  if (!activeGroupId) {
    return (
      <div className="flex-1 flex items-center justify-center text-(--muted) text-sm">
        <p>Select a group to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-linear-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveGroupId(null)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 desktop-hidden"
            aria-label="Back to groups"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="w-11 h-11 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center text-base font-bold text-white shadow-lg shadow-purple-500/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{group?.name || "Loading..."}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {group?.participants.length} members
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
          aria-label="Group settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 dark:text-zinc-400">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m0-15L7.5 6M12 1l4.5 5M1 12h6m6 0h6m-15 0l5-4.5M1 12l5 4.5m11-9.5L21.5 6M23 12l-5 4.5M23 12l-5-4.5"/>
          </svg>
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && group && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-background border border-(--border)/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)/40">
              <h3 className="font-semibold text-sm">Group Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--foreground)/6 transition-colors duration-150 text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[70vh]">
              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-(--muted) uppercase tracking-wider">Group Name</label>
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
                        className="flex-1 px-3 py-2 text-sm bg-background border border-(--border)/60 rounded-lg focus:outline-none focus:border-(--border) transition-colors duration-150"
                      />
                      <button
                        onClick={handleUpdateGroup}
                        className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-opacity duration-150"
                      >
                        Save
                      </button>
                    </div>
                    {updateError && (
                      <p className="text-xs text-(--danger) bg-(--danger)/10 px-3 py-2 rounded-lg border border-(--danger)/20 flex items-center gap-2">
                        <span className="text-sm leading-none">⚠</span>
                        {updateError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-(--muted) uppercase tracking-wider">Add Member</label>
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
                        className="flex-1 px-3 py-2 text-sm bg-background border border-(--border)/60 rounded-lg focus:outline-none focus:border-(--border) transition-colors duration-150"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddMember();
                          }
                        }}
                      />
                      <button
                        onClick={handleAddMember}
                        className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-opacity duration-150"
                      >
                        Add
                      </button>
                    </div>
                    {addError && (
                      <p className="text-xs text-(--danger) bg-(--danger)/10 px-3 py-2 rounded-lg border border-(--danger)/20 flex items-center gap-2">
                        <span className="text-sm leading-none">⚠</span>
                        {addError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-medium text-(--muted) uppercase tracking-wider">
                  Members ({group.participants.length})
                </label>
                <div className="space-y-0.5 bg-(--foreground)/2 border border-(--border)/30 rounded-xl p-2">
                  {group.participants.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-(--foreground)/4 transition-colors duration-150"
                    >
                      <span className="text-[13px]">
                        {p.username}
                        {group.admins.some((a) => a._id === p._id) && (
                          <span className="text-[10px] text-(--foreground)/50 ml-1.5 font-medium uppercase tracking-wide">(admin)</span>
                        )}
                        {group.createdBy._id === p._id && (
                          <span className="text-[10px] text-(--muted) ml-1.5 font-medium uppercase tracking-wide">(owner)</span>
                        )}
                      </span>
                      {isAdmin && p._id !== userId && p._id !== group.createdBy._id && (
                        <button
                          onClick={() => handleRemoveMember(p._id)}
                          className="text-[11px] text-(--danger) hover:underline transition-all duration-150"
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
                  onClick={openDeleteGroupConfirm}
                  className="w-full px-4 py-2.5 bg-(--danger)/10 text-(--danger) text-sm font-medium rounded-lg hover:bg-(--danger)/20 transition-colors duration-150 border border-(--danger)/20"
                >
                  Delete Group
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
                <div className="h-16 w-52 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-bl-md" />
              </div>
            </div>
            {/* Sent message skeleton */}
            <div className="flex justify-end">
              <div className="h-14 w-44 rounded-2xl bg-linear-to-br from-[#948979] to-[#7d7466] animate-pulse rounded-br-md" />
            </div>
            {/* Received message skeleton */}
            <div className="flex gap-3">
              <div className="space-y-1">
                <div className="h-2.5 w-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
                <div className="h-20 w-60 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-bl-md" />
              </div>
            </div>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 dark:text-purple-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No messages yet</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Be the first to send a message</p>
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
              onReply={() => {
                setReplyingTo(msg);
                inputRef.current?.focus();
              }}
              onImageClick={(url) => setLightboxUrl(url)}
              onMemberClick={(memberId) => setProfileUserId(memberId)}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="shrink-0 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-[#c4b59e]/20 to-[#c4b59e]/40 dark:from-[#393E46]/30 dark:to-[#393E46]/20 flex items-center gap-3 animate-[slideDown_0.2s_ease-out]">
          <div className="w-1 h-12 bg-linear-to-b from-[#948979] to-[#7d7466] rounded-full shadow-lg shadow-[#948979]/30" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#948979] dark:text-[#DFD0B8]/70 mb-0.5">
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

      {/* Image Preview */}
      {messageImage && (
        <div className="shrink-0 px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="relative inline-block">
            <Image
              src={messageImage.url}
              alt="Upload preview"
              width={120}
              height={120}
              className="rounded-lg object-cover max-h-[120px] w-auto"
              unoptimized
            />
            <button
              type="button"
              onClick={() => setMessageImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-md"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2.5 items-end bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl"
      >
        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setIsUploading(true);
              await startUpload([file]);
            }
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Attach file"
          className="w-11 h-11 rounded-2xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <svg className="animate-spin w-5 h-5 text-[#948979]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 dark:text-zinc-400">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          )}
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full px-5 py-3.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#948979] transition-all text-[15px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            disabled={sending}
          />
        </div>
        <button
          type="submit"
          disabled={sending || (!input.trim() && !messageImage)}
          title="Send message"
          className="w-11 h-11 bg-linear-to-br from-[#948979] to-[#7d7466] text-white font-medium rounded-full hover:shadow-lg hover:shadow-[#948979]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center active:scale-95"
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
      </form>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <Image
            src={lightboxUrl}
            alt="Full size image"
            width={1200}
            height={1200}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
            unoptimized
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteGroupConfirm}
        title="Delete Group"
        message="Are you sure you want to delete this group? All messages and members will be removed. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupConfirm(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!profileUserId}
        userId={profileUserId || ""}
        onClose={() => setProfileUserId(null)}
        groupId={activeGroupId || undefined}
      />
    </div>
  );
}