"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import { ProfilePageSkeleton } from "@/components/Skeleton";
import ConfirmModal from "@/components/ConfirmModal";
import { signIn, signOut } from "next-auth/react";
import { useChatStore } from "@/lib/store";

interface Comment {
  _id: string;
  userId: string;
  text: string;
  createdAt: string;
}

interface Blog {
  _id: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

interface UserProfileProps {
  userId: string;
  onClose?: () => void;
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const router = useRouter();
  const { setActiveView, setTargetBlogId } = useChatStore();
  const [user, setUser] = useState<User | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [deleteBlogConfirm, setDeleteBlogConfirm] = useState<{ isOpen: boolean; blogId: string | null }>({
    isOpen: false,
    blogId: null,
  });
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setBlogs(data.blogs || []);
        setEditName(data.user.username);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!editName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: editName }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [editName]);

  const handleProfilePictureUpload = useCallback(async (result: any) => {
    try {
      const info = result.info;
      if (typeof info !== "object" || !info || !("secure_url" in info)) return;

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profilePictureUrl: info.secure_url,
          profilePicturePublicId: info.public_id,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleDeleteBlog = useCallback(async (blogId: string) => {
    try {
      const res = await fetch(`/api/blogs/${blogId}`, { method: "DELETE" });
      if (res.ok) {
        setBlogs((prev) => prev.filter((b) => b._id !== blogId));
      }
    } catch {
      // Ignore
    } finally {
      setDeleteBlogConfirm({ isOpen: false, blogId: null });
    }
  }, []);

  const openDeleteBlogConfirm = useCallback((blogId: string) => {
    setDeleteBlogConfirm({ isOpen: true, blogId });
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setDeleteAccountConfirm(false);
    }
  }, []);

  const handleNavigateToBlog = useCallback((blogId: string) => {
    setTargetBlogId(blogId);
    setActiveView("blog");
    onClose?.(); // Close the profile modal
  }, [setActiveView, setTargetBlogId, onClose]);

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-zinc-500 text-sm">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Profile Header Card */}
        <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-6 md:p-8 mb-8 relative overflow-visible shadow-xl backdrop-blur-sm">
          {/* 3-Dot Menu */}
          <div className="absolute top-4 right-4 z-20" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 overflow-hidden transform origin-top-right animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setDeleteAccountConfirm(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                  Delete Account
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-4 ring-[#1a1a1a] shadow-2xl relative">
                {user.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={user.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-3xl">
                    👤
                  </div>
                )}

                {/* Upload Overlay */}
                {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
                  <CldUploadWidget
                    uploadPreset="giga_chat"
                    onSuccess={handleProfilePictureUpload}
                  >
                    {({ open }) => (
                      <div
                        onClick={() => open()}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      </div>
                    )}
                  </CldUploadWidget>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left w-full">
              {isEditing ? (
                <div className="space-y-4 max-w-sm mx-auto md:mx-0 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 ml-1">Username</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2 justify-center md:justify-start">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors shadow-lg shadow-white/5"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.username);
                      }}
                      className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">{user.username}</h1>
                  <p className="text-zinc-500 text-sm font-medium">{user.email}</p>
                </div>
              )}

              {/* Stats */}
              {!isEditing && (
                <div className="flex items-center justify-center md:justify-start gap-8 mt-6">
                  <div className="text-center md:text-left">
                    <p className="text-xl font-bold text-white">{blogs.length}</p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Posts</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xl font-bold text-white">
                      {blogs.reduce((acc, blog) => acc + blog.likes.length, 0)}
                    </p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Likes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-4 px-1">Recent Posts</h2>

          {blogs.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 dashed border-2 border-zinc-800/50">
              <p>No posts yet. Start sharing!</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {blogs.map((blog) => (
                <div
                  key={blog._id}
                  onClick={() => handleNavigateToBlog(blog._id)}
                  className="bg-[#121212] border border-zinc-800 rounded-2xl p-5 md:p-6 hover:border-zinc-700 transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs text-zinc-500 font-medium">
                      {new Date(blog.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteBlogConfirm(blog._id);
                      }}
                      className="text-zinc-600 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Post"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                  </div>

                  <p className="text-zinc-300 text-sm md:text-base mb-4 whitespace-pre-wrap leading-relaxed">
                    {blog.content}
                  </p>

                  {blog.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-zinc-800/50 bg-black/50">
                      <Image
                        src={blog.imageUrl}
                        alt="Blog post image"
                        width={600}
                        height={400}
                        className="w-full h-auto object-cover max-h-96"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={blog.likes.length > 0 ? "text-pink-500 fill-pink-500/20" : ""}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                      <span>{blog.likes.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      <span>{blog.comments.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Blog Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteBlogConfirm.isOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteBlogConfirm.blogId) {
            handleDeleteBlog(deleteBlogConfirm.blogId);
          }
        }}
        onCancel={() => setDeleteBlogConfirm({ isOpen: false, blogId: null })}
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteAccountConfirm}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountConfirm(false)}
      />
    </div>
  );
}
