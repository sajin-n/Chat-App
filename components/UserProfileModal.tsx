"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useChatStore } from "@/lib/store";

interface Blog {
  _id: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: { _id: string }[];
  createdAt: string;
}

interface UserData {
  _id: string;
  username: string;
  profilePicture?: string;
  createdAt: string;
}

interface SharedMedia {
  url: string;
  type: "image" | "link";
  timestamp: string;
  messageContent?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  /** If provided, also loads shared media from this chat */
  chatId?: string;
  /** If provided, loads shared media from this group */
  groupId?: string;
}

type TabType = "posts" | "media";

export default function UserProfileModal({
  isOpen,
  userId,
  onClose,
  chatId,
  groupId,
}: UserProfileModalProps) {
  const { setActiveView, setTargetBlogId } = useChatStore();
  const [user, setUser] = useState<UserData | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const hasChatContext = !!(chatId || groupId);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setBlogs(data.blogs || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchSharedMedia = useCallback(async () => {
    if (!chatId && !groupId) return;
    try {
      const endpoint = chatId
        ? `/api/chats/${chatId}/messages?limit=200`
        : `/api/groups/${groupId}/messages?limit=200`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const messages = data.messages || [];
        const media: SharedMedia[] = [];

        for (const msg of messages) {
          // Images
          if (msg.imageUrl) {
            media.push({
              url: msg.imageUrl,
              type: "image",
              timestamp: msg.createdAt,
              messageContent: msg.content,
            });
          }
          // Links in content
          if (msg.content) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = msg.content.match(urlRegex);
            if (urls) {
              for (const url of urls) {
                media.push({
                  url,
                  type: "link",
                  timestamp: msg.createdAt,
                  messageContent: msg.content,
                });
              }
            }
          }
        }

        setSharedMedia(media);
      }
    } catch {
      // Ignore
    }
  }, [chatId, groupId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
      fetchSharedMedia();
      setActiveTab("posts");
    }
  }, [isOpen, userId, fetchProfile, fetchSharedMedia]);

  const handleNavigateToBlog = useCallback(
    (blogId: string) => {
      setTargetBlogId(blogId);
      setActiveView("blog");
      onClose();
    },
    [setActiveView, setTargetBlogId, onClose]
  );

  if (!isOpen) return null;

  const sharedImages = sharedMedia.filter((m) => m.type === "image");
  const sharedLinks = sharedMedia.filter((m) => m.type === "link");

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[85vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-[modalIn_0.25s_cubic-bezier(0.16,1,0.3,1)] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="animate-spin h-8 w-8 text-[#948979]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-zinc-500">Loading profile...</p>
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-zinc-500">User not found</p>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="px-6 pt-6 pb-5 text-center border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden ring-4 ring-zinc-100 dark:ring-zinc-800 shadow-lg">
                {user.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={user.username}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-[#948979] to-[#7d7466] flex items-center justify-center text-2xl font-bold text-white">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {user.username}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center gap-8 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{blogs.length}</p>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {blogs.reduce((acc, b) => acc + b.likes.length, 0)}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Likes</p>
                </div>
                {hasChatContext && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{sharedMedia.length}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Shared</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <button
                onClick={() => setActiveTab("posts")}
                className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                  activeTab === "posts"
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                Posts
                {activeTab === "posts" && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#948979] rounded-full" />
                )}
              </button>
              {hasChatContext && (
                <button
                  onClick={() => setActiveTab("media")}
                  className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                    activeTab === "media"
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                >
                  Media & Links
                  {activeTab === "media" && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#948979] rounded-full" />
                  )}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === "posts" && (
                <div className="p-4">
                  {blogs.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <p className="text-sm">No posts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blogs.map((blog) => (
                        <button
                          key={blog._id}
                          onClick={() => handleNavigateToBlog(blog._id)}
                          className="w-full text-left bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group hover:shadow-md"
                        >
                          <p className="text-xs text-zinc-400 mb-2">
                            {new Date(blog.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 whitespace-pre-wrap">
                            {blog.content}
                          </p>
                          {blog.imageUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                              <Image
                                src={blog.imageUrl}
                                alt="Post"
                                width={400}
                                height={200}
                                className="w-full h-32 object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-pink-400">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                              {blog.likes.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              {blog.comments.length}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "media" && hasChatContext && (
                <div className="p-4 space-y-6">
                  {/* Shared Images */}
                  {sharedImages.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                        Images ({sharedImages.length})
                      </h3>
                      <div className="grid grid-cols-3 gap-1.5">
                        {sharedImages.map((media, i) => (
                          <button
                            key={i}
                            onClick={() => setLightboxUrl(media.url)}
                            className="aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 hover:opacity-80 transition-opacity"
                            title="View full image"
                          >
                            <Image
                              src={media.url}
                              alt="Shared"
                              width={150}
                              height={150}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared Links */}
                  {sharedLinks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                        Links ({sharedLinks.length})
                      </h3>
                      <div className="space-y-2">
                        {sharedLinks.map((media, i) => (
                          <a
                            key={i}
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-blue-600 dark:text-blue-400 truncate group-hover:underline">
                                {media.url}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                {new Date(media.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {sharedImages.length === 0 && sharedLinks.length === 0 && (
                    <div className="text-center py-12 text-zinc-400">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <p className="text-sm">No shared media yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/90 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <Image
            src={lightboxUrl}
            alt="Full size"
            width={1200}
            height={1200}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
