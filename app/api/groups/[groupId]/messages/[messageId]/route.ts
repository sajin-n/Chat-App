import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Message } from "@/lib/models/Message";
import { Chat } from "@/lib/models/Chat";
import { unauthorizedResponse, notFoundResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; messageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { groupId, messageId } = await params;

    await dbConnect();

    const group = await Chat.findOne({
      _id: groupId,
      isGroup: true,
      participants: session.user.id,
    });

    if (!group) {
      return notFoundResponse("Group");
    }

    const message = await Message.findOne({ _id: messageId, chatId: groupId });

    if (!message) {
      return notFoundResponse("Message");
    }

    // Only sender can delete their own message
    if (message.senderId.toString() !== session.user.id) {
      return errorResponse("Can only delete your own messages", 403);
    }

    await Message.deleteOne({ _id: messageId });

    logger.info("Group message deleted", { messageId, groupId, userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete group message", { error: String(error) });
    return serverErrorResponse();
  }
}
