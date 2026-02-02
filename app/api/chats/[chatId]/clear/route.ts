import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Message } from "@/lib/models/Message";
import { Chat } from "@/lib/models/Chat";
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

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

    // Delete all messages in the chat
    const result = await Message.deleteMany({ chatId });

    // Clear last message
    await Chat.updateOne({ _id: chatId }, { lastMessage: "", updatedAt: new Date() });

    logger.info("Chat cleared", { chatId, deletedCount: result.deletedCount, userId: session.user.id });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error("Failed to clear chat", { error: String(error) });
    return serverErrorResponse();
  }
}
