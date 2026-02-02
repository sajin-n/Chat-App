"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { ProfilePageSkeleton } from "@/components/Skeleton";

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

interface UploadResult {
  event?: string;
  info?: {
    secure_url: string;
    public_id: string;
  };
}

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!confirm("Delete this blog?")) return;

    try {
      const res = await fetch(`/api/blogs/${blogId}`, { method: "DELETE" });
      if (res.ok) {
        setBlogs((prev) => prev.filter((b) => b._id !== blogId));
      }
    } catch {
      // Ignore
    }
  }, []);

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-[var(--muted)] text-sm">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Card */}
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="p-8">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <div className="relative group">
              {user.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  alt={user.username}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-[var(--background)] shadow-md transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--border)] to-[var(--border)]/50 flex items-center justify-center text-3xl shadow-md ring-4 ring-[var(--background)] transition-transform group-hover:scale-105">
                  👤
                </div>
              )}
              {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
                <CldUploadWidget
                  uploadPreset="giga_chat"
                  onSuccess={handleProfilePictureUpload}
                >
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="absolute -bottom-1 -right-1 bg-[var(--accent)] text-[var(--accent-foreground)] p-2 rounded-full hover:bg-[var(--accent)]/90 shadow-lg transition-all hover:scale-110 text-sm"
                      aria-label="Upload profile picture"
                    >
                      📷
                    </button>
                  )}
                </CldUploadWidget>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all text-base shadow-sm"
                    placeholder="Username"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-5 py-2.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl hover:bg-[var(--accent)]/90 disabled:opacity-50 transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.username);
                      }}
                      className="px-5 py-2.5 border border-[var(--border)] rounded-xl hover:bg-[var(--border)]/30 transition-all text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-2xl font-bold tracking-tight truncate">{user.username}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-1.5 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--border)]/30 transition-all hover:shadow-sm"
                    >
                      Edit Profile
                    </button>
                  </div>
                  <p className="text-sm text-[var(--muted)] truncate">{user.email}</p>
                  <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--border)]">
                    <div>
                      <p className="text-2xl font-bold">{blogs.length}</p>
                      <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Posts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {blogs.reduce((acc, blog) => acc + blog.likes.length, 0)}
                      </p>
                      <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Likes</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">Posts</h2>
        </div>

        {blogs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4 opacity-50">📝</div>
            <p className="text-[var(--muted)] text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {blogs.map((blog) => (
              <div
                key={blog._id}
                className="p-6 hover:bg-[var(--border)]/10 transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs text-[var(--muted)] font-medium">
                    {new Date(blog.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => handleDeleteBlog(blog._id)}
                    className="text-[var(--danger)] hover:bg-[var(--danger)]/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>

                <p className="text-sm mb-3 whitespace-pre-wrap leading-relaxed">
                  {blog.content}
                </p>

                {blog.imageUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
                    <Image
                      src={blog.imageUrl}
                      alt="Blog post image"
                      width={600}
                      height={300}
                      className="w-full max-h-80 object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                )}

                <div className="flex gap-5 text-sm">
                  <span className="text-[var(--muted)] flex items-center gap-1.5">
                    <span className="text-base">❤️</span>
                    {blog.likes.length}
                  </span>
                  <span className="text-[var(--muted)] flex items-center gap-1.5">
                    <span className="text-base">💬</span>
                    {blog.comments.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}