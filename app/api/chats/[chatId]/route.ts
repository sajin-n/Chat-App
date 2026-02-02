import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Chat } from "@/lib/models/Chat";
import { Message } from "@/lib/models/Message";
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// Get single chat details
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

    await dbConnect();

    const chat = await Chat.findOne({
      _id: chatId,
      participants: session.user.id,
    }).populate("participants", "username");

    if (!chat) {
      return notFoundResponse("Chat");
    }

    return NextResponse.json(chat);
  } catch (error) {
    logger.error("Failed to get chat", { error: String(error) });
    return serverErrorResponse();
  }
}

// Delete chat (only for direct chats, or group admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { chatId } = await params;

    await dbConnect();

    const chat = await Chat.findOne({
      _id: chatId,
      participants: session.user.id,
    });

    if (!chat) {
      return notFoundResponse("Chat");
    }

    // Delete all messages first
    await Message.deleteMany({ chatId });

    // Delete the chat
    await Chat.deleteOne({ _id: chatId });

    logger.info("Chat deleted", { chatId, userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete chat", { error: String(error) });
    return serverErrorResponse();
  }
}
