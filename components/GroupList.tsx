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
    <div className="flex flex-col h-full bg-linear-to-b from-[#DFD0B8] to-[#d4c5a8] dark:from-[#222831] dark:to-[#1c2028]">
      {/* Header with New Group Button */}
      <div className="p-4 border-b border-[#c4b59e] dark:border-[#393E46] bg-[#DFD0B8]/80 dark:bg-[#222831]/80 backdrop-blur-sm">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`w-full py-3 px-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-95 ${showCreate
              ? "bg-[#c4b59e]/30 dark:bg-[#393E46] text-[#393E46] dark:text-[#948979]"
              : "bg-linear-to-r from-[#948979] to-[#7d7466] text-[#DFD0B8] shadow-[#948979]/30 hover:shadow-lg hover:shadow-[#948979]/40"
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
        <form onSubmit={handleCreate} className="p-4 border-b border-[#c4b59e] dark:border-[#393E46] space-y-3 bg-linear-to-br from-[#c4b59e]/20 to-[#c4b59e]/30 dark:from-[#393E46]/30 dark:to-[#393E46]/20 animate-[slideDown_0.2s_ease-out]">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-3 bg-[#DFD0B8] dark:bg-[#222831] border border-[#c4b59e] dark:border-[#393E46] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#948979] transition-all placeholder:text-[#948979] dark:placeholder:text-[#948979]/70"
          />
          <input
            type="text"
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            placeholder="Usernames (comma separated)"
            className="w-full px-4 py-3 bg-[#DFD0B8] dark:bg-[#222831] border border-[#c4b59e] dark:border-[#393E46] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#948979] transition-all placeholder:text-[#948979] dark:placeholder:text-[#948979]/70"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 bg-linear-to-r from-[#948979] to-[#7d7466] text-[#DFD0B8] rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-[#948979]/30 disabled:opacity-40 transition-all shadow-md active:scale-95"
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
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#c4b59e]/40 to-[#c4b59e]/60 dark:from-[#393E46] dark:to-[#393E46]/60 flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#948979] dark:text-[#DFD0B8]/60">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-[#948979] dark:text-[#948979] text-center font-medium">No groups yet</p>
            <p className="text-xs text-[#948979]/70 dark:text-[#948979]/60 text-center mt-1">Create a group above</p>
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
                    ? "bg-linear-to-r from-[#c4b59e]/30 to-[#c4b59e]/50 dark:from-[#393E46]/50 dark:to-[#393E46]/30 border-l-4 border-[#948979]"
                    : "hover:bg-[#c4b59e]/15 dark:hover:bg-[#393E46]/30 border-l-4 border-transparent"
                  }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-linear-to-r from-[#948979]/10 to-transparent pointer-events-none"></div>
                )}

                {/* Group Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-md transition-all ${isActive
                      ? "bg-linear-to-br from-[#948979] to-[#7d7466] text-[#DFD0B8] shadow-[#948979]/30 scale-105"
                      : "bg-linear-to-br from-[#c4b59e]/50 to-[#c4b59e]/70 dark:from-[#393E46] dark:to-[#4a5060] text-[#393E46] dark:text-[#DFD0B8]/80 group-hover:scale-105"
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
                      ? "bg-[#948979]/30 dark:bg-[#948979]/20 text-[#393E46] dark:text-[#DFD0B8]"
                      : "bg-[#c4b59e]/30 dark:bg-[#393E46] text-[#393E46] dark:text-[#948979]"
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
