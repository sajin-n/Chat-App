import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";

// In-memory store for typing status (resets on server restart)
const typingStatus = new Map<string, Map<string, number>>();

const TYPING_TIMEOUT = 3000; // 3 seconds
const MAX_TRACKED_CHATS = 500; // Prevent unbounded memory growth

// Global cleanup runs at most once per 10 seconds
let lastGlobalCleanup = 0;
function globalCleanup() {
  const now = Date.now();
  if (now - lastGlobalCleanup < 10_000) return;
  lastGlobalCleanup = now;

  for (const [chatId, chatTyping] of typingStatus) {
    for (const [userId, timestamp] of chatTyping) {
      if (now - timestamp > TYPING_TIMEOUT) {
        chatTyping.delete(userId);
      }
    }
    if (chatTyping.size === 0) {
      typingStatus.delete(chatId);
    }
  }
}

function cleanupExpired(chatId: string) {
  const chatTyping = typingStatus.get(chatId);
  if (!chatTyping) return;
  
  const now = Date.now();
  for (const [userId, timestamp] of chatTyping.entries()) {
    if (now - timestamp > TYPING_TIMEOUT) {
      chatTyping.delete(userId);
    }
  }
  
  if (chatTyping.size === 0) {
    typingStatus.delete(chatId);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { chatId } = await params;
    
    cleanupExpired(chatId);
    
    const chatTyping = typingStatus.get(chatId);
    const typingUsers: string[] = [];
    
    if (chatTyping) {
      for (const userId of chatTyping.keys()) {
        if (userId !== session.user.id) {
          typingUsers.push(userId);
        }
      }
    }

    return NextResponse.json({ typing: typingUsers });
  } catch (error) {
    return serverErrorResponse();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { chatId } = await params;
    const body = await req.json();
    const { isTyping } = body ?? {};

    if (typeof isTyping !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isTyping value; expected boolean" },
        { status: 400 }
      );
    }

    globalCleanup();

    if (!typingStatus.has(chatId)) {
      // Cap the number of tracked chats to prevent memory exhaustion
      if (typingStatus.size >= MAX_TRACKED_CHATS) {
        const firstKey = typingStatus.keys().next().value;
        if (firstKey) typingStatus.delete(firstKey);
      }
      typingStatus.set(chatId, new Map());
    }

    const chatTyping = typingStatus.get(chatId)!;
    
    if (isTyping) {
      chatTyping.set(session.user.id, Date.now());
    } else {
      chatTyping.delete(session.user.id);
    }

    cleanupExpired(chatId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverErrorResponse();
  }
}
