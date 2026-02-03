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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header with New Group Button */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${showCreate
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm hover:opacity-90"
            }`}
        >
          {showCreate ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <form onSubmit={handleCreate} className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50 dark:bg-zinc-800/50">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <input
            type="text"
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            placeholder="Usernames (comma separated)"
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
          {error && <p className="text-red-500 text-xs px-1">{error}</p>}
        </form>
      )}

      {/* Group List */}
      <div className="flex-1 overflow-y-auto">
        {loading && <GroupListSkeleton count={4} />}
        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">No groups yet</p>
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
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${isActive
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
              >
                {/* Group Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isActive
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300"
                  }`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate text-zinc-700 dark:text-zinc-300">
                      {group.name}
                    </p>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {group.lastMessage && (
                    <p className="text-sm truncate mt-0.5 text-zinc-500 dark:text-zinc-500">
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
