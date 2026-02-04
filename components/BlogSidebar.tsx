"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
    _id: string;
    username: string;
    profilePicture?: string;
}

interface Blog {
    _id: string;
    authorId: { _id: string; username: string; profilePicture?: string };
    content: string;
    createdAt: string;
}

interface BlogSidebarProps {
    userId: string;
    onSelectPost?: (blogId: string) => void;
    onSelectUser?: (userId: string) => void;
    onClose?: () => void;
}

export default function BlogSidebar({ userId, onSelectPost, onSelectUser, onClose }: BlogSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState<"posts" | "users">("posts");
    const [searchResults, setSearchResults] = useState<{ users: User[]; blogs: Blog[] }>({ users: [], blogs: [] });
    const [loading, setLoading] = useState(false);
    const [recentUsers, setRecentUsers] = useState<User[]>([]);
    const [trendingPosts, setTrendingPosts] = useState<Blog[]>([]);

    // Fetch recent users and trending posts on mount
    useEffect(() => {
        async function fetchInitialData() {
            try {
                // Fetch some users
                const usersRes = await fetch("/api/users?limit=5");
                if (usersRes.ok) {
                    const data = await usersRes.json();
                    setRecentUsers(data.users || []);
                }

                // Fetch recent/trending posts
                const blogsRes = await fetch("/api/blogs?limit=5");
                if (blogsRes.ok) {
                    const data = await blogsRes.json();
                    setTrendingPosts(data.blogs?.slice(0, 5) || []);
                }
            } catch {
                // Ignore errors
            }
        }
        fetchInitialData();
    }, []);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults({ users: [], blogs: [] });
            return;
        }

        setLoading(true);
        try {
            if (searchType === "users") {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults({ users: data.users || [], blogs: [] });
                }
            } else {
                const res = await fetch(`/api/blogs/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults({ users: [], blogs: data.blogs || [] });
                }
            }
        } catch {
            // Ignore errors
        } finally {
            setLoading(false);
        }
    }, [searchQuery, searchType]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setSearchResults({ users: [], blogs: [] });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchType, handleSearch]);

    const truncateContent = (content: string, maxLength: number = 60) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + "...";
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            {/* Search Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchType === "posts" ? "Search posts..." : "Search users..."}
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                        />
                    </div>
                    {/* Close button for mobile */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="md:hidden flex-shrink-0 w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                            aria-label="Close sidebar"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Search Type Toggle */}
                <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button
                        onClick={() => setSearchType("posts")}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${searchType === "posts"
                            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                            }`}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            Posts
                        </span>
                    </button>
                    <button
                        onClick={() => setSearchType("users")}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${searchType === "users"
                            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                            }`}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Users
                        </span>
                    </button>
                </div>
            </div>

            {/* Results / Content */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin h-5 w-5 text-zinc-400" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}

                {/* Search Results */}
                {!loading && searchQuery && (
                    <div className="py-2">
                        {searchType === "users" && searchResults.users.length > 0 && (
                            searchResults.users.map((user) => (
                                <button
                                    key={user._id}
                                    onClick={() => onSelectUser?.(user._id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center overflow-hidden">
                                        {user.profilePicture ? (
                                            <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                                                {user.username?.[0]?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{user.username}</span>
                                </button>
                            ))
                        )}

                        {searchType === "posts" && searchResults.blogs.length > 0 && (
                            searchResults.blogs.map((blog) => (
                                <button
                                    key={blog._id}
                                    onClick={() => onSelectPost?.(blog._id)}
                                    className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            {blog.authorId.username}
                                        </span>
                                        <span className="text-xs text-zinc-400">·</span>
                                        <span className="text-xs text-zinc-400">{formatDate(blog.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                        {truncateContent(blog.content)}
                                    </p>
                                </button>
                            ))
                        )}

                        {((searchType === "users" && searchResults.users.length === 0) ||
                            (searchType === "posts" && searchResults.blogs.length === 0)) && (
                                <div className="flex flex-col items-center justify-center py-8 px-4">
                                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No {searchType} found</p>
                                </div>
                            )}
                    </div>
                )}

                {/* Default Content - when no search */}
                {!loading && !searchQuery && (
                    <div className="py-2">
                        {/* Trending Posts */}
                        {trendingPosts.length > 0 && (
                            <div className="mb-4">
                                <h3 className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Recent Posts
                                </h3>
                                {trendingPosts.map((blog) => (
                                    <button
                                        key={blog._id}
                                        onClick={() => onSelectPost?.(blog._id)}
                                        className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                {blog.authorId.username}
                                            </span>
                                            <span className="text-xs text-zinc-400">·</span>
                                            <span className="text-xs text-zinc-400">{formatDate(blog.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                            {truncateContent(blog.content)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Recent Users */}
                        {recentUsers.length > 0 && (
                            <div>
                                <h3 className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    People to Follow
                                </h3>
                                {recentUsers.filter(u => u._id !== userId).slice(0, 4).map((user) => (
                                    <button
                                        key={user._id}
                                        onClick={() => onSelectUser?.(user._id)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center overflow-hidden">
                                            {user.profilePicture ? (
                                                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                                                    {user.username?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{user.username}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {trendingPosts.length === 0 && recentUsers.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                                    Search for posts or users
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}
