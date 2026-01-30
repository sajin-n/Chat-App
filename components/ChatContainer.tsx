"use client";

import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import { ErrorBoundary, ChatErrorFallback } from "@/components/ErrorBoundary";

interface ChatContainerProps {
  userId: string;
}

export default function ChatContainer({ userId }: ChatContainerProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <ErrorBoundary fallback={<ChatErrorFallback />}>
        <ChatList userId={userId} />
      </ErrorBoundary>
      <ErrorBoundary fallback={<ChatErrorFallback />}>
        <ChatWindow userId={userId} />
      </ErrorBoundary>
    </div>
  );
}
