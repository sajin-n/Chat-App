"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { GroupListSkeleton } from "@/components/Skeleton";

interface Group {
  _id: string;
  name: string;
  participants: { _id: string; username: string }[];
  admins: { _id: string; username: string }[];
  createdBy: { _id: string; username: string };
  lastMessage?: string;
  updatedAt: string;
}

interface GroupListProps {
  userId: string;
}

export default function GroupList({ userId }: GroupListProps) {
  const { activeGroupId, setActiveGroupId, setMobileMenuOpen } = useChatStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [usernames, setUsernames] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        setGroups(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 5000);
    return () => clearInterval(interval);
  }, [fetchGroups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() || !usernames.trim() || creating) return;

    setCreating(true);
    setError("");

    try {
      const usernameList = usernames.split(",").map((u) => u.trim()).filter(Boolean);
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, usernames: usernameList }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      setGroupName("");
      setUsernames("");
      setShowCreate(false);
      setActiveGroupId(data._id);
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  function handleSelectGroup(groupId: string) {
    setActiveGroupId(groupId);
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
      {/* Header with New Group Button */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`w-full py-3 px-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-95 ${showCreate
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              : "bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
            }`}
        >
          {showCreate ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Group
            </>
          )}
        </button>
      </div>

      {/* Create Group Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 animate-[slideDown_0.2s_ease-out]">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <input
            type="text"
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            placeholder="Usernames (comma separated)"
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 transition-all shadow-md active:scale-95"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
          {error && <p className="text-red-500 text-xs px-1 animate-[slideDown_0.2s_ease-out]">{error}</p>}
        </form>
      )}

      {/* Group List */}
      <div className="flex-1 overflow-y-auto">
        {loading && <GroupListSkeleton count={4} />}
        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 dark:text-purple-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center font-medium">No groups yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-1">Create a group above</p>
          </div>
        )}
        <div className="py-2">
          {groups.map((group) => {
            const isActive = activeGroupId === group._id;
            const memberCount = group.participants.length;
            return (
              <button
                key={group._id}
                onClick={() => handleSelectGroup(group._id)}
                className={`w-full text-left px-4 py-3.5 flex items-center gap-3.5 transition-all relative overflow-hidden group ${isActive
                    ? "bg-linear-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-l-4 border-purple-500"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border-l-4 border-transparent"
                  }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-transparent pointer-events-none"></div>
                )}

                {/* Group Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-md transition-all ${isActive
                      ? "bg-linear-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/30 scale-105"
                      : "bg-linear-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 group-hover:scale-105"
                    }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`font-semibold truncate text-[15px] ${isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {group.name}
                    </p>
                    <span className={`text-xs shrink-0 px-2 py-1 rounded-full ${isActive 
                      ? "bg-purple-200 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}>
                      {memberCount}
                    </span>
                  </div>
                  {group.lastMessage && (
                    <p className="text-sm truncate text-zinc-500 dark:text-zinc-500">
                      {group.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
