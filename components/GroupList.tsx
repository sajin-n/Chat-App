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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border)]">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary w-full text-sm"
        >
          {showCreate ? "Cancel" : "+ New Group"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-b border-[var(--border)] space-y-2">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="input"
          />
          <input
            type="text"
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            placeholder="Usernames (comma separated)"
            className="input"
          />
          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary w-full"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
          {error && <p className="text-[var(--danger)] text-xs">{error}</p>}
        </form>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && <GroupListSkeleton count={4} />}
        {!loading && groups.length === 0 && (
          <p className="p-3 text-sm text-[var(--muted)]">No groups yet</p>
        )}
        {groups.map((group) => {
          const isActive = activeGroupId === group._id;
          const memberCount = group.participants.length;
          return (
            <button
              key={group._id}
              onClick={() => handleSelectGroup(group._id)}
              className={`w-full text-left p-3 border-b border-[var(--border)] transition-colors ${
                isActive ? "bg-[var(--border)]" : "hover:bg-[var(--border)]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">{group.name}</p>
                <span className="text-xs text-[var(--muted)]">{memberCount}</span>
              </div>
              {group.lastMessage && (
                <p className="text-sm text-[var(--muted)] truncate mt-0.5">
                  {group.lastMessage}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
