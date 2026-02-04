"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { BlogPostSkeleton } from "@/components/Skeleton";
import ReportModal from "@/components/ReportModal";
import { useChatStore } from "@/lib/store";

interface Blog {
  _id: string;
  authorId: { _id: string; username: string; profilePicture?: string };
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: Array<{
    _id: string;
    authorId: { _id: string; username: string; profilePicture?: string };
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  profilePicture?: string;
}

interface BlogFeedProps {
  userId: string;
}

export default function BlogFeed({ userId }: BlogFeedProps) {
  const { targetBlogId, setTargetBlogId } = useChatStore();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBlogContent, setNewBlogContent] = useState("");
  const [newBlogImage, setNewBlogImage] = useState<{ url: string; publicId: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [closingComments, setClosingComments] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingBlog, setEditingBlog] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<string | null>(null);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState<string>("");
  const [savingCommentEdit, setSavingCommentEdit] = useState<string | null>(null);
  const [openCommentMenus, setOpenCommentMenus] = useState<Record<string, boolean>>({});
  const [reportData, setReportData] = useState<{
    isOpen: boolean;
    type: "user" | "post" | "comment";
    id: string;
    name?: string;
  }>({
    isOpen: false,
    type: "post",
    id: "",
  });
  const blogRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  // Get current user info
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    }
    getCurrentUser();
  }, []);

  const fetchBlogs = useCallback(async () => {
    try {
      const res = await fetch("/api/blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
    const interval = setInterval(fetchBlogs, 5000);
    return () => clearInterval(interval);
  }, [fetchBlogs]);

  // Scroll direction tracking for header hide/show - immediate response
  const handleFeedScroll = useCallback(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    // Use RAF to batch scroll updates without delay
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current as unknown as number);
    }

    scrollTimeoutRef.current = requestAnimationFrame(() => {
      const currentScrollY = container.scrollTop;
      const scrollDiff = currentScrollY - lastScrollY.current;

      // Respond quickly with small threshold
      if (Math.abs(scrollDiff) > 15) {
        if (scrollDiff > 0 && currentScrollY > 50) {
          // Scrolling down - hide header immediately
          setIsHeaderHidden(true);
        } else if (scrollDiff < 0) {
          // Scrolling up - show header immediately
          setIsHeaderHidden(false);
        }
        lastScrollY.current = currentScrollY;
      }
    }) as unknown as NodeJS.Timeout;
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.menu-container') || target.closest('.menu-dropdown')) {
        return;
      }
      setOpenMenus({});
      setOpenCommentMenus({});
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to target blog post when navigating from profile
  useEffect(() => {
    if (targetBlogId && blogs.length > 0 && blogRefs.current[targetBlogId]) {
      setTimeout(() => {
        blogRefs.current[targetBlogId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Clear the target after scrolling
        setTimeout(() => setTargetBlogId(null), 1000);
      }, 100);
    }
  }, [targetBlogId, blogs, setTargetBlogId]);

  const handlePostBlog = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlogContent.trim() && !newBlogImage) return;

    setPosting(true);
    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newBlogContent.trim(),
          imageUrl: newBlogImage?.url,
          imagePublicId: newBlogImage?.publicId,
        }),
      });

      if (res.ok) {
        setNewBlogContent("");
        setNewBlogImage(null);
        fetchBlogs();
      }
    } finally {
      setPosting(false);
    }
  }, [newBlogContent, newBlogImage, fetchBlogs]);

  const handleLike = useCallback(async (blogId: string) => {
    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleLike: true }),
      });

      if (res.ok) {
        const updatedBlog = await res.json();
        setBlogs((prev) =>
          prev.map((b) => (b._id === blogId ? updatedBlog : b))
        );
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleDeleteBlog = useCallback(async (blogId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setBlogs((prev) => prev.filter((b) => b._id !== blogId));
        console.log('Blog deleted successfully');
      } else {
        console.error('Failed to delete blog:', res.status, res.statusText);
        alert('Failed to delete post. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('Failed to delete post. Please try again.');
    }
  }, []);

  const handleEditBlog = useCallback((blogId: string, currentContent: string) => {
    setEditingBlog(blogId);
    setEditingContent(currentContent);
    setOpenMenus({});
  }, []);

  const handleSaveEdit = useCallback(async (blogId: string) => {
    if (!editingContent.trim()) return;

    setSavingEdit(blogId);
    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      });

      if (res.ok) {
        const updatedBlog = await res.json();
        setBlogs((prev) =>
          prev.map((b) => (b._id === blogId ? updatedBlog : b))
        );
        setEditingBlog(null);
        setEditingContent("");
        console.log('Blog updated successfully');
      } else {
        console.error('Failed to update blog:', res.status, res.statusText);
        alert('Failed to update post. Please try again.');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setSavingEdit(null);
    }
  }, [editingContent]);

  const handleCancelEdit = useCallback(() => {
    setEditingBlog(null);
    setEditingContent("");
  }, []);

  const toggleMenu = useCallback((blogId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    console.log('Toggle menu clicked for blogId:', blogId);
    console.log('Current openMenus state:', openMenus);

    setOpenMenus((prev) => {
      const newState = {
        ...prev,
        [blogId]: !prev[blogId]
      };
      console.log('New openMenus state:', newState);
      return newState;
    });
  }, [openMenus]);

  const handleEditComment = useCallback((commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditingCommentContent(currentContent);
    setOpenCommentMenus({});
  }, []);

  const handleSaveCommentEdit = useCallback(async (blogId: string, commentId: string) => {
    if (!editingCommentContent.trim()) return;

    setSavingCommentEdit(commentId);
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingCommentContent }),
      });

      if (res.ok) {
        setEditingComment(null);
        setEditingCommentContent("");
        fetchBlogs();
      }
    } finally {
      setSavingCommentEdit(null);
    }
  }, [editingCommentContent, fetchBlogs]);

  const handleCancelCommentEdit = useCallback(() => {
    setEditingComment(null);
    setEditingCommentContent("");
  }, []);

  const handleDeleteComment = useCallback(async (blogId: string, commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await fetch(`/api/blogs/${blogId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchBlogs();
      }
    } catch {
      // Ignore
    }
  }, [fetchBlogs]);

  const toggleCommentMenu = useCallback((commentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenCommentMenus((prev) => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  }, []);

  const handleAddComment = useCallback(
    async (blogId: string) => {
      const content = commentTexts[blogId]?.trim();
      if (!content) return;

      try {
        const res = await fetch(`/api/blogs/${blogId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (res.ok) {
          setCommentTexts((prev) => ({ ...prev, [blogId]: "" }));
          fetchBlogs();
        }
      } catch {
        // Ignore
      }
    },
    [commentTexts, fetchBlogs]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-linear-to-b from-background to-zinc-50 dark:to-zinc-950">
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 2000px;
          }
        }

        @keyframes expandDown {
          from {
            opacity: 0;
            transform: scaleY(0.95) translateY(-10px);
            transform-origin: top;
          }
          to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
            transform-origin: top;
          }
        }

        @keyframes collapseUp {
          from {
            opacity: 1;
            transform: scaleY(1) translateY(0);
            transform-origin: top;
            max-height: 2000px;
          }
          to {
            opacity: 0;
            transform: scaleY(0.95) translateY(-10px);
            transform-origin: top;
            max-height: 0;
          }
        }

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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-down {
          animation: slideDown 0.2s ease-out;
        }

        .animate-expand-down {
          animation: expandDown 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-collapse-up {
          animation: collapseUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.15s ease-out;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .dark .glass-effect {
          background: rgba(0, 0, 0, 0.4);
        }

        .post-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .post-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .post-card:hover::before {
          opacity: 1;
        }

        .post-card:hover {
          transform: translateY(-4px);
        }

        .icon-button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .icon-button:hover {
          transform: scale(1.05);
        }

        .icon-button:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* Create Post - Collapsible Header */}
      <div
        className="z-10"
        style={{
          transform: isHeaderHidden ? 'scaleY(0)' : 'scaleY(1)',
          transformOrigin: 'top',
          opacity: isHeaderHidden ? 0 : 1,
          height: isHeaderHidden ? 0 : 'auto',
          transition: 'transform 0.3s ease-out, opacity 0.2s ease-out, height 0s linear ' + (isHeaderHidden ? '0.3s' : '0s'),
          pointerEvents: isHeaderHidden ? 'none' : 'auto',
        }}
      >
        <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-gradient-to-b from-white via-white to-zinc-50/90 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950/90 backdrop-blur-xl shadow-lg">
          <div className="max-w-2xl mx-auto w-full p-4">
            <form onSubmit={handlePostBlog} className="space-y-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-600 dark:via-zinc-500 dark:to-zinc-600 rounded-2xl blur opacity-0 group-focus-within:opacity-60 transition duration-500"></div>
                <textarea
                  value={newBlogContent}
                  onChange={(e) => setNewBlogContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="relative w-full p-4 border-0 rounded-2xl bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-900 text-[var(--foreground)] resize-none focus:outline-none ring-1 ring-zinc-200 dark:ring-zinc-700 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-inner"
                  rows={3}
                />
              </div>

              {newBlogImage && (
                <div className="relative rounded-2xl overflow-hidden shadow-lg animate-scale-in group">
                  <Image
                    src={newBlogImage.url}
                    alt="Preview"
                    width={400}
                    height={300}
                    className="w-full max-h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  <button
                    type="button"
                    onClick={() => setNewBlogImage(null)}
                    className="absolute top-3 right-3 bg-black/80 text-white w-8 h-8 rounded-full hover:bg-black transition-all duration-200 flex items-center justify-center shadow-lg hover:scale-110"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
              )}

              <div className="flex gap-3 items-center justify-between">
                <div className="flex gap-2">
                  {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
                    <CldUploadWidget
                      uploadPreset="giga_chat"
                      onSuccess={(result: any) => {
                        if (result?.info && typeof result.info === "object" && "secure_url" in result.info && "public_id" in result.info) {
                          setNewBlogImage({
                            url: result.info.secure_url as string,
                            publicId: result.info.public_id as string,
                          });
                        }
                      }}
                    >
                      {({ open }) => (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="icon-button px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow border border-zinc-200 dark:border-zinc-700"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          Photo
                        </button>
                      )}
                    </CldUploadWidget>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={posting || (!newBlogContent.trim() && !newBlogImage)}
                  className="icon-button px-6 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:hover:shadow-md"
                >
                  {posting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Posting...
                    </span>
                  ) : (
                    "Post"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={feedContainerRef}
        onScroll={handleFeedScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-2xl mx-auto w-full px-2 sm:px-4 py-6">
          {loading && (
            <div className="space-y-4 animate-fade-in">
              {Array.from({ length: 3 }).map((_, i) => (
                <BlogPostSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && blogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No posts yet</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Be the first to share something!</p>
            </div>
          )}

          <div className="space-y-4">
            {blogs.map((blog, index) => {
              const authorId = blog.authorId._id?.toString?.() ?? blog.authorId._id;
              const isAuthor = authorId === userId || (currentUser?._id && authorId === currentUser._id.toString?.());
              const isLiked = blog.likes.some((id: string | { toString?: () => string }) =>
                (typeof id === 'string' ? id : id.toString?.()) === userId
              );

              return (
                <div
                  key={blog._id}
                  ref={(el) => { blogRefs.current[blog._id] = el; }}
                  className={`post-card bg-white dark:bg-zinc-900 border rounded-3xl shadow-lg hover:shadow-2xl relative overflow-hidden animate-slide-up backdrop-blur-sm ${targetBlogId === blog._id
                    ? "border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/50 dark:ring-purple-400/50"
                    : "border-zinc-200/60 dark:border-zinc-800/60"
                    }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-5">
                    {/* Author Info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {blog.authorId.profilePicture ? (
                            <Image
                              src={blog.authorId.profilePicture}
                              alt={blog.authorId.username}
                              width={44}
                              height={44}
                              className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-600 dark:from-zinc-200 dark:to-zinc-400 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-lg ring-2 ring-zinc-100 dark:ring-zinc-800">
                              {blog.authorId.username[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{blog.authorId.username}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {new Date(blog.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="relative menu-container">
                        <button
                          onClick={(e) => toggleMenu(blog._id, e)}
                          className="icon-button p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200"
                          title="Options"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400 dark:text-zinc-500">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {openMenus[blog._id] && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenus({})}></div>
                            <div className="menu-dropdown absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 z-50 min-w-[140px] animate-slide-down overflow-hidden">
                              {isAuthor ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenus({});
                                      handleEditBlog(blog._id, blog.content);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 flex items-center gap-2 font-medium"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                  </button>
                                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenus({});
                                      handleDeleteBlog(blog._id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150 flex items-center gap-2 font-medium"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenus({});
                                      setReportData({
                                        isOpen: true,
                                        type: "post",
                                        id: blog._id,
                                        name: blog.content?.slice(0, 30) + (blog.content?.length > 30 ? "..." : "")
                                      });
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 flex items-center gap-2 font-medium"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                      <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    Report Post
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenus({});
                                      setReportData({
                                        isOpen: true,
                                        type: "user",
                                        id: (blog.authorId._id?.toString?.() ?? blog.authorId._id) as string,
                                        name: blog.authorId.username
                                      });
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150 flex items-center gap-2 font-medium"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                      <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    Report User
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    {editingBlog === blog._id ? (
                      <div className="mb-4 space-y-3 animate-scale-in">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-4 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-all shadow-sm"
                          rows={4}
                          placeholder="What's on your mind?"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(blog._id)}
                            disabled={savingEdit === blog._id || !editingContent.trim()}
                            className="icon-button px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
                          >
                            {savingEdit === blog._id ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="icon-button px-5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      blog.content && (
                        <p className="mb-4 whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200">
                          {blog.content}
                        </p>
                      )
                    )}

                    {/* Image */}
                    {blog.imageUrl && (
                      <div className="mb-4 -mx-5 sm:mx-0 sm:rounded-xl overflow-hidden group">
                        <div className="relative">
                          <Image
                            src={blog.imageUrl}
                            alt="Blog"
                            width={500}
                            height={400}
                            className="w-full max-h-96 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-6 py-4 text-sm border-t border-zinc-100 dark:border-zinc-800 mt-2">
                      <button
                        onClick={() => handleLike(blog._id)}
                        className={`icon-button flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isLiked
                          ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                          }`}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={isLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="font-medium">{blog.likes.length}</span>
                      </button>
                      <button
                        onClick={() => {
                          const isExpanded = expandedComments[blog._id];
                          if (isExpanded) {
                            // Start closing animation
                            setClosingComments((prev) => ({ ...prev, [blog._id]: true }));
                            // After animation, actually close
                            setTimeout(() => {
                              setExpandedComments((prev) => ({ ...prev, [blog._id]: false }));
                              setClosingComments((prev) => ({ ...prev, [blog._id]: false }));
                            }, 300);
                          } else {
                            // Open immediately
                            setExpandedComments((prev) => ({ ...prev, [blog._id]: true }));
                          }
                        }}
                        className="icon-button flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="font-medium">{blog.comments.length}</span>
                      </button>
                    </div>

                    {/* Comments */}
                    {expandedComments[blog._id] && (
                      <div className={`space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 ${closingComments[blog._id] ? 'animate-collapse-up' : 'animate-expand-down'
                        }`}>
                        {blog.comments.map((comment) => (
                          <div key={comment._id} className="flex gap-3">
                            {comment.authorId.profilePicture ? (
                              <Image
                                src={comment.authorId.profilePicture}
                                alt={comment.authorId.username}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-zinc-100 dark:ring-zinc-800"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-500 dark:from-zinc-300 dark:to-zinc-500 flex items-center justify-center text-xs text-white dark:text-zinc-900 font-bold flex-shrink-0 ring-2 ring-zinc-100 dark:ring-zinc-800">
                                {comment.authorId.username[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-2xl p-3 relative group hover:from-zinc-100 hover:to-zinc-50 dark:hover:from-zinc-800 dark:hover:to-zinc-800/50 transition-all duration-200 border border-zinc-200/50 dark:border-zinc-700/50">
                                <div className="flex items-start justify-between mb-1">
                                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                    {comment.authorId.username}
                                  </p>
                                  {(() => {
                                    const commentAuthorId = comment.authorId._id?.toString?.() ?? comment.authorId._id;
                                    const isCommentAuthor = commentAuthorId === userId || (currentUser?._id && commentAuthorId === currentUser._id.toString?.());
                                    return (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => toggleCommentMenu(comment._id, e)}
                                          className="icon-button opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all"
                                          title="Options"
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400">
                                            <circle cx="12" cy="5" r="2" />
                                            <circle cx="12" cy="12" r="2" />
                                            <circle cx="12" cy="19" r="2" />
                                          </svg>
                                        </button>
                                        {openCommentMenus[comment._id] && (
                                          <div className="menu-dropdown absolute right-0 top-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-20 min-w-[100px] animate-slide-down">
                                            {isCommentAuthor && (
                                              <button
                                                onClick={() => handleEditComment(comment._id, comment.content)}
                                                className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium flex items-center gap-2"
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                Edit
                                              </button>
                                            )}
                                            {(isCommentAuthor || isAuthor) ? (
                                              <button
                                                onClick={() => {
                                                  setOpenCommentMenus({});
                                                  handleDeleteComment(blog._id, comment._id);
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors font-medium flex items-center gap-2"
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="3 6 5 6 21 6" />
                                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                                Delete
                                              </button>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    setOpenCommentMenus({});
                                                    setReportData({
                                                      isOpen: true,
                                                      type: "comment",
                                                      id: comment._id,
                                                      name: comment.content?.slice(0, 30) + (comment.content?.length > 30 ? "..." : "")
                                                    });
                                                  }}
                                                  className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium flex items-center gap-2"
                                                >
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                                    <line x1="4" y1="22" x2="4" y2="15" />
                                                  </svg>
                                                  Report Comment
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setOpenCommentMenus({});
                                                    setReportData({
                                                      isOpen: true,
                                                      type: "user",
                                                      id: (comment.authorId._id?.toString?.() ?? comment.authorId._id) as string,
                                                      name: comment.authorId.username
                                                    });
                                                  }}
                                                  className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors font-medium flex items-center gap-2"
                                                >
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                    <circle cx="12" cy="7" r="4" />
                                                  </svg>
                                                  Report User
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                {editingComment === comment._id ? (
                                  <div className="space-y-2 animate-scale-in">
                                    <textarea
                                      value={editingCommentContent}
                                      onChange={(e) => setEditingCommentContent(e.target.value)}
                                      className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none shadow-sm"
                                      rows={2}
                                      placeholder="Edit your comment..."
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSaveCommentEdit(blog._id, comment._id)}
                                        disabled={savingCommentEdit === comment._id || !editingCommentContent.trim()}
                                        className="icon-button px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 transition-all shadow-sm"
                                      >
                                        {savingCommentEdit === comment._id ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        onClick={handleCancelCommentEdit}
                                        className="icon-button px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm break-words text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                    {comment.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Comment */}
                        <div className="flex gap-3 pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-600 dark:from-zinc-200 dark:to-zinc-400 rounded-full flex items-center justify-center text-xs text-white dark:text-zinc-900 font-bold flex-shrink-0 ring-2 ring-zinc-100 dark:ring-zinc-800">
                            {currentUser?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="flex-1 flex gap-2 min-w-0">
                            <input
                              type="text"
                              value={commentTexts[blog._id] || ""}
                              onChange={(e) =>
                                setCommentTexts((prev) => ({
                                  ...prev,
                                  [blog._id]: e.target.value,
                                }))
                              }
                              placeholder="Write a comment..."
                              className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent min-w-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm hover:shadow transition-shadow"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddComment(blog._id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleAddComment(blog._id)}
                              disabled={!commentTexts[blog._id]?.trim()}
                              className="icon-button px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-md hover:shadow-lg"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ReportModal
        isOpen={reportData.isOpen}
        onClose={() => setReportData({ ...reportData, isOpen: false })}
        reportedType={reportData.type}
        reportedId={reportData.id}
        reportedName={reportData.name}
      />
    </div>
  );
}