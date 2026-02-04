"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import ConfirmModal from "@/components/ConfirmModal";

interface User {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
    createdAt: string;
    postCount: number;
}

interface Post {
    _id: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    likeCount: number;
    commentCount: number;
}

interface Comment {
    _id: string;
    content: string;
    author: { _id: string; username: string; email: string } | null;
    blog: { _id: string; content: string } | null;
    likeCount: number;
    createdAt: string;
}

interface Report {
    _id: string;
    reporter: { _id: string; username: string; email: string } | null;
    reportedType: "user" | "post" | "comment";
    reportedId: string;
    reportedItem: any;
    reason: string;
    description?: string;
    status: "pending" | "resolved";
    createdAt: string;
}

type TabType = "users" | "comments" | "reports";

export default function DeveloperDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>("users");
    const [users, setUsers] = useState<User[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [loadingReports, setLoadingReports] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [reportFilter, setReportFilter] = useState<"all" | "pending" | "resolved">("all");

    // Confirmation modal states
    const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ isOpen: boolean; userId: string | null }>({
        isOpen: false,
        userId: null,
    });
    const [deletePostConfirm, setDeletePostConfirm] = useState<{ isOpen: boolean; postId: string | null }>({
        isOpen: false,
        postId: null,
    });
    const [deleteCommentConfirm, setDeleteCommentConfirm] = useState<{ isOpen: boolean; commentId: string | null }>({
        isOpen: false,
        commentId: null,
    });
    const [deleteReportConfirm, setDeleteReportConfirm] = useState<{ isOpen: boolean; reportId: string | null }>({
        isOpen: false,
        reportId: null,
    });

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        try {
            const res = await fetch("/api/admin/comments");
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } finally {
            setLoadingComments(false);
        }
    }, []);

    const fetchReports = useCallback(async () => {
        setLoadingReports(true);
        try {
            const res = await fetch("/api/admin/reports");
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
            }
        } finally {
            setLoadingReports(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (activeTab === "comments") {
            fetchComments();
        } else if (activeTab === "reports") {
            fetchReports();
        }
    }, [activeTab, fetchComments, fetchReports]);

    const fetchUserPosts = async (userId: string) => {
        setLoadingPosts(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setUserPosts(data.posts || []);
            }
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleSelectUser = async (user: User) => {
        setSelectedUser(user);
        await fetchUserPosts(user._id);
    };

    const handleDeleteUser = async (userId: string) => {
        setDeleting(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
            if (res.ok) {
                setUsers(users.filter((u) => u._id !== userId));
                if (selectedUser?._id === userId) {
                    setSelectedUser(null);
                    setUserPosts([]);
                }
            }
        } finally {
            setDeleting(null);
            setDeleteUserConfirm({ isOpen: false, userId: null });
        }
    };

    const openDeleteUserConfirm = (userId: string) => {
        setDeleteUserConfirm({ isOpen: true, userId });
    };

    const handleDeletePost = async (postId: string) => {
        setDeleting(postId);
        try {
            const res = await fetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
            if (res.ok) {
                setUserPosts(userPosts.filter((p) => p._id !== postId));
                if (selectedUser) {
                    setSelectedUser({ ...selectedUser, postCount: selectedUser.postCount - 1 });
                    setUsers(users.map((u) =>
                        u._id === selectedUser._id ? { ...u, postCount: u.postCount - 1 } : u
                    ));
                }
            }
        } finally {
            setDeleting(null);
            setDeletePostConfirm({ isOpen: false, postId: null });
        }
    };

    const openDeletePostConfirm = (postId: string) => {
        setDeletePostConfirm({ isOpen: true, postId });
    };

    const handleDeleteComment = async (commentId: string) => {
        setDeleting(commentId);
        try {
            const res = await fetch(`/api/admin/comments/${commentId}`, { method: "DELETE" });
            if (res.ok) {
                setComments(comments.filter((c) => c._id !== commentId));
            }
        } finally {
            setDeleting(null);
            setDeleteCommentConfirm({ isOpen: false, commentId: null });
        }
    };

    const openDeleteCommentConfirm = (commentId: string) => {
        setDeleteCommentConfirm({ isOpen: true, commentId });
    };

    const handleResolveReport = async (reportId: string) => {
        setDeleting(reportId);
        try {
            const res = await fetch(`/api/admin/reports/${reportId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "resolved" }),
            });
            if (res.ok) {
                setReports(reports.map((r) =>
                    r._id === reportId ? { ...r, status: "resolved" as const } : r
                ));
            }
        } finally {
            setDeleting(null);
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        setDeleting(reportId);
        try {
            const res = await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" });
            if (res.ok) {
                setReports(reports.filter((r) => r._id !== reportId));
            }
        } finally {
            setDeleting(null);
            setDeleteReportConfirm({ isOpen: false, reportId: null });
        }
    };

    const openDeleteReportConfirm = (reportId: string) => {
        setDeleteReportConfirm({ isOpen: true, reportId });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const filteredReports = reports.filter((r) => {
        if (reportFilter === "all") return true;
        return r.status === reportFilter;
    });

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">Developer Dashboard</h1>
                            <p className="text-xs text-zinc-400">GigaChat Admin Panel</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1 border-b border-zinc-800">
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === "users"
                                ? "text-white"
                                : "text-zinc-400 hover:text-zinc-300"
                                }`}
                        >
                            Users & Posts
                            {activeTab === "users" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("comments")}
                            className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === "comments"
                                ? "text-white"
                                : "text-zinc-400 hover:text-zinc-300"
                                }`}
                        >
                            Comments
                            {activeTab === "comments" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("reports")}
                            className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === "reports"
                                ? "text-white"
                                : "text-zinc-400 hover:text-zinc-300"
                                }`}
                        >
                            Reports
                            {reports.filter(r => r.status === "pending").length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                    {reports.filter(r => r.status === "pending").length}
                                </span>
                            )}
                            {activeTab === "reports" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Users & Posts Tab */}
                {activeTab === "users" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Users List */}
                        <div className="lg:col-span-1">
                            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                                <div className="p-4 border-b border-zinc-800">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        Users ({users.length})
                                    </h2>
                                </div>

                                <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                                    {loading ? (
                                        <div className="p-8 text-center text-zinc-500">
                                            <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Loading users...
                                        </div>
                                    ) : users.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500">
                                            No users found
                                        </div>
                                    ) : (
                                        users.map((user) => (
                                            <div
                                                key={user._id}
                                                className={`p-4 border-b border-zinc-800 last:border-0 cursor-pointer transition-colors ${selectedUser?._id === user._id
                                                    ? "bg-zinc-800"
                                                    : "hover:bg-zinc-800/50"
                                                    }`}
                                                onClick={() => handleSelectUser(user)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center overflow-hidden">
                                                            {user.profilePicture ? (
                                                                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-sm font-semibold">{user.username?.[0]?.toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{user.username}</p>
                                                            <p className="text-xs text-zinc-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full">
                                                            {user.postCount} posts
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDeleteUserConfirm(user._id);
                                                            }}
                                                            disabled={deleting === user._id}
                                                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* User Posts */}
                        <div className="lg:col-span-2">
                            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                                <div className="p-4 border-b border-zinc-800">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        {selectedUser ? `Posts by ${selectedUser.username}` : "Select a user"}
                                    </h2>
                                </div>

                                <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                                    {!selectedUser ? (
                                        <div className="p-12 text-center text-zinc-500">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-50">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                            </svg>
                                            <p>Select a user from the list to view their posts</p>
                                        </div>
                                    ) : loadingPosts ? (
                                        <div className="p-8 text-center text-zinc-500">
                                            <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Loading posts...
                                        </div>
                                    ) : userPosts.length === 0 ? (
                                        <div className="p-12 text-center text-zinc-500">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-50">
                                                <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                            <p>This user has no posts</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-zinc-800">
                                            {userPosts.map((post) => (
                                                <div key={post._id} className="p-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                                                                {post.content}
                                                            </p>
                                                            {post.imageUrl && (
                                                                <div className="mt-3 rounded-xl overflow-hidden max-w-sm">
                                                                    <img src={post.imageUrl} alt="Post" className="w-full" />
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                                                                <span>{formatDate(post.createdAt)}</span>
                                                                <span className="flex items-center gap-1">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                                    </svg>
                                                                    {post.likeCount}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                                                    </svg>
                                                                    {post.commentCount}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => openDeletePostConfirm(post._id)}
                                                            disabled={deleting === post._id}
                                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                                                        >
                                                            {deleting === post._id ? (
                                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Comments Tab */}
                {activeTab === "comments" && (
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                        <div className="p-4 border-b border-zinc-800">
                            <h2 className="font-semibold flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                All Comments ({comments.length})
                            </h2>
                        </div>

                        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                            {loadingComments ? (
                                <div className="p-8 text-center text-zinc-500">
                                    <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Loading comments...
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="p-12 text-center text-zinc-500">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-50">
                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                    </svg>
                                    <p>No comments found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800">
                                    {comments.map((comment) => (
                                        <div key={comment._id} className="p-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {comment.author ? (
                                                            <>
                                                                <span className="text-sm font-medium text-zinc-300">{comment.author.username}</span>
                                                                <span className="text-xs text-zinc-500">•</span>
                                                                <span className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-sm text-zinc-500">[Deleted User]</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-zinc-400 mb-2">{comment.content}</p>
                                                    {comment.blog && (
                                                        <div className="mt-2 p-2 bg-zinc-800 rounded-lg text-xs text-zinc-500">
                                                            Post: {comment.blog.content}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                                        <span className="flex items-center gap-1">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                            </svg>
                                                            {comment.likeCount}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => openDeleteCommentConfirm(comment._id)}
                                                    disabled={deleting === comment._id}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                                                >
                                                    {deleting === comment._id ? (
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reports Tab */}
                {activeTab === "reports" && (
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="text-sm text-zinc-400">Filter:</span>
                            <div className="flex gap-2">
                                {(["all", "pending", "resolved"] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setReportFilter(filter)}
                                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${reportFilter === filter
                                            ? "bg-purple-500 text-white"
                                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                            }`}
                                    >
                                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                        {filter !== "all" && (
                                            <span className="ml-1.5">
                                                ({reports.filter((r) => r.status === filter).length})
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                            <div className="p-4 border-b border-zinc-800">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    Reports ({filteredReports.length})
                                </h2>
                            </div>

                            <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
                                {loadingReports ? (
                                    <div className="p-8 text-center text-zinc-500">
                                        <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Loading reports...
                                    </div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-500">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-50">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                        <p>No {reportFilter !== "all" ? reportFilter : ""} reports found</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-800">
                                        {filteredReports.map((report) => (
                                            <div key={report._id} className="p-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${report.reportedType === "user"
                                                                ? "bg-blue-500/20 text-blue-400"
                                                                : report.reportedType === "post"
                                                                    ? "bg-purple-500/20 text-purple-400"
                                                                    : "bg-green-500/20 text-green-400"
                                                                }`}>
                                                                {report.reportedType.toUpperCase()}
                                                            </span>
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${report.status === "pending"
                                                                ? "bg-yellow-500/20 text-yellow-400"
                                                                : "bg-zinc-700 text-zinc-400"
                                                                }`}>
                                                                {report.status.toUpperCase()}
                                                            </span>
                                                            <span className="text-xs text-zinc-500">{formatDate(report.createdAt)}</span>
                                                        </div>

                                                        <div className="mb-2">
                                                            <p className="text-sm font-medium text-zinc-300 mb-1">
                                                                Reason: <span className="text-red-400">{report.reason}</span>
                                                            </p>
                                                            {report.description && (
                                                                <p className="text-sm text-zinc-400">{report.description}</p>
                                                            )}
                                                        </div>

                                                        <div className="text-xs text-zinc-500 space-y-1">
                                                            {report.reporter && (
                                                                <p>
                                                                    Reporter: <span className="text-zinc-400">{report.reporter.username}</span>
                                                                </p>
                                                            )}
                                                            {report.reportedItem && !report.reportedItem.deleted && (
                                                                <p className="bg-zinc-800 p-2 rounded mt-2">
                                                                    {report.reportedType === "user" && `User: ${report.reportedItem.username}`}
                                                                    {report.reportedType === "post" && `Post: ${report.reportedItem.content}`}
                                                                    {report.reportedType === "comment" && `Comment: ${report.reportedItem.content}`}
                                                                </p>
                                                            )}
                                                            {report.reportedItem?.deleted && (
                                                                <p className="text-red-400">[Reported item has been deleted]</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 flex-shrink-0">
                                                        {report.status === "pending" && (
                                                            <button
                                                                onClick={() => handleResolveReport(report._id)}
                                                                disabled={deleting === report._id}
                                                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Mark as resolved"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openDeleteReportConfirm(report._id)}
                                                            disabled={deleting === report._id}
                                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Delete report"
                                                        >
                                                            {deleting === report._id ? (
                                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                {activeTab === "users" && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Users</p>
                            <p className="text-2xl font-bold mt-1">{users.length}</p>
                        </div>
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Posts</p>
                            <p className="text-2xl font-bold mt-1">{users.reduce((sum, u) => sum + u.postCount, 0)}</p>
                        </div>
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Posts/User</p>
                            <p className="text-2xl font-bold mt-1">
                                {users.length > 0 ? (users.reduce((sum, u) => sum + u.postCount, 0) / users.length).toFixed(1) : 0}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={deleteUserConfirm.isOpen}
                title="Delete User"
                message="Are you sure you want to delete this user? This will delete all their posts, comments, and messages."
                confirmText="Delete User"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => {
                    if (deleteUserConfirm.userId) {
                        handleDeleteUser(deleteUserConfirm.userId);
                    }
                }}
                onCancel={() => setDeleteUserConfirm({ isOpen: false, userId: null })}
            />

            <ConfirmModal
                isOpen={deletePostConfirm.isOpen}
                title="Delete Post"
                message="Are you sure you want to delete this post?"
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => {
                    if (deletePostConfirm.postId) {
                        handleDeletePost(deletePostConfirm.postId);
                    }
                }}
                onCancel={() => setDeletePostConfirm({ isOpen: false, postId: null })}
            />

            <ConfirmModal
                isOpen={deleteCommentConfirm.isOpen}
                title="Delete Comment"
                message="Are you sure you want to delete this comment?"
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => {
                    if (deleteCommentConfirm.commentId) {
                        handleDeleteComment(deleteCommentConfirm.commentId);
                    }
                }}
                onCancel={() => setDeleteCommentConfirm({ isOpen: false, commentId: null })}
            />

            <ConfirmModal
                isOpen={deleteReportConfirm.isOpen}
                title="Delete Report"
                message="Are you sure you want to delete this report?"
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => {
                    if (deleteReportConfirm.reportId) {
                        handleDeleteReport(deleteReportConfirm.reportId);
                    }
                }}
                onCancel={() => setDeleteReportConfirm({ isOpen: false, reportId: null })}
            />
        </div>
    );
}
