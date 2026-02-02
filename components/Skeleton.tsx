"use client";

import { ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// Base Skeleton component with pulse animation
export function Skeleton({ className = "", animate = true }: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-200 dark:bg-zinc-800 rounded ${animate ? "animate-pulse" : ""} ${className}`}
    />
  );
}

// Profile skeleton for user avatars
export function ProfileSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };
  
  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
}

// Text skeleton for lines of text
export function TextSkeleton({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

// Card skeleton wrapper
export function CardSkeleton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// Blog post skeleton
export function BlogPostSkeleton() {
  return (
    <CardSkeleton className="space-y-4 animate-pulse">
      {/* Header with avatar and info */}
      <div className="flex items-center gap-3">
        <ProfileSkeleton size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      {/* Image placeholder (optional) */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      {/* Actions */}
      <div className="flex gap-6 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </CardSkeleton>
  );
}

// Blog feed skeleton
export function BlogFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto w-full">
      {/* Create post skeleton */}
      <CardSkeleton className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </CardSkeleton>
      
      {/* Posts */}
      {Array.from({ length: count }).map((_, i) => (
        <BlogPostSkeleton key={i} />
      ))}
    </div>
  );
}

// Profile page skeleton
export function ProfilePageSkeleton() {
  return (
    <div className="p-4 space-y-6 animate-pulse">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <ProfileSkeleton size="lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      
      {/* Stats or info section */}
      <div className="flex gap-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      {/* User's posts header */}
      <Skeleton className="h-5 w-32" />
      
      {/* Mini post list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chat list skeleton
export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
          <ProfileSkeleton size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

// Chat window skeleton
export function ChatWindowSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <ProfileSkeleton size="md" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        {/* Received message */}
        <div className="flex gap-3">
          <ProfileSkeleton size="sm" />
          <div className="space-y-1">
            <Skeleton className="h-16 w-48 rounded-2xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        
        {/* Sent message */}
        <div className="flex justify-end">
          <div className="space-y-1 flex flex-col items-end">
            <Skeleton className="h-12 w-40 rounded-2xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        
        {/* Received message */}
        <div className="flex gap-3">
          <ProfileSkeleton size="sm" />
          <div className="space-y-1">
            <Skeleton className="h-20 w-56 rounded-2xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Group list skeleton
export function GroupListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
          <Skeleton className="w-11 h-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Full page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
