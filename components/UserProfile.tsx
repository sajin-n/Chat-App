"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useUploadThing } from "@/lib/uploadthing";
import { ProfilePageSkeleton } from "@/components/Skeleton";
import ConfirmModal from "@/components/ConfirmModal";
import { signOut } from "next-auth/react";
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleProfilePictureUpload = useCallback(async (res: any[]) => {
    try {
      if (!res?.[0]) return;

      const uploadRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profilePictureUrl: res[0].ufsUrl,
          profilePicturePublicId: res[0].key,
        }),
      });

      if (uploadRes.ok) {
        const updatedUser = await uploadRes.json();
        setUser(updatedUser);
      }
    } catch {
      // Ignore
    }
  }, []);

  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload: startProfileUpload } = useUploadThing("blogImageUploader", {
    onClientUploadComplete: (res) => {
      handleProfilePictureUpload(res);
      setIsProfileUploading(false);
    },
    onUploadError: (error) => {
      console.error("Profile picture upload error:", error);
      setIsProfileUploading(false);
    },
  });

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
      <div className="flex-1 flex items-center justify-center min-h-50">
        <p className="text-zinc-500 text-sm">User not found</p>
      </div>
    );
  }

  return (
    <div className="text-zinc-900 dark:text-zinc-100 pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Profile Header Card */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 mb-6 relative overflow-visible shadow-sm">
          {/* 3-Dot Menu */}
          <div className="absolute top-4 right-4 z-20" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              title="Profile options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 z-30 overflow-hidden animate-[scaleIn_0.15s_ease-out]">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setDeleteAccountConfirm(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                  Delete Account
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            {/* Profile Picture */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-lg relative">
                {user.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={user.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}

                {/* Upload Overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-full overflow-hidden">
                  <input
                    ref={profileFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsProfileUploading(true);
                        await startProfileUpload([file]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    disabled={isProfileUploading}
                    className="w-full h-full flex items-center justify-center bg-transparent hover:bg-black/20 transition-colors rounded-full"
                    title="Change profile picture"
                  >
                    {isProfileUploading ? (
                      <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left w-full">
              {isEditing ? (
                <div className="space-y-4 max-w-sm mx-auto md:mx-0 animate-[scaleIn_0.2s_ease-out]">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">Username</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2 justify-center md:justify-start">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-5 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.username);
                      }}
                      className="px-5 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{user.username}</h1>
                  <p className="text-zinc-500 text-sm">{user.email}</p>
                </div>
              )}

              {/* Stats */}
              {!isEditing && (
                <div className="flex items-center justify-center md:justify-start gap-8 mt-5">
                  <div className="text-center md:text-left">
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{blogs.length}</p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Posts</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
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
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-3 px-1">Recent Posts</h2>

          {blogs.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-800/30 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
              <p className="text-sm">No posts yet. Start sharing!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {blogs.map((blog) => (
                <div
                  key={blog._id}
                  onClick={() => handleNavigateToBlog(blog._id)}
                  className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs text-zinc-400 font-medium">
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
                      className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Post"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                  </div>

                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
                    {blog.content}
                  </p>

                  {blog.imageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <Image
                        src={blog.imageUrl}
                        alt="Blog post image"
                        width={600}
                        height={400}
                        className="w-full h-auto object-cover max-h-64"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={blog.likes.length > 0 ? "text-pink-500 fill-pink-500/20" : ""}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                      <span className="text-xs font-medium">{blog.likes.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      <span className="text-xs font-medium">{blog.comments.length}</span>
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
