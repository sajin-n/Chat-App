import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// In-memory store for typing status (resets on server restart)
const typingStatus: Map<string, Map<string, number>> = new Map();

const TYPING_TIMEOUT = 3000; // 3 seconds

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
    logger.error("Failed to get typing status", { error: String(error) });
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
    const { isTyping } = await req.json();

    if (!typingStatus.has(chatId)) {
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
    logger.error("Failed to update typing status", { error: String(error) });
    return serverErrorResponse();
  }
}
