import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Chat } from "@/lib/models/Chat";
import { Message } from "@/lib/models/Message";
import { User } from "@/lib/models/User";
import { createChatSchema } from "@/lib/validations";
import { validationErrorResponse, unauthorizedResponse, notFoundResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();

    const chats = await Chat.find({
      participants: session.user.id,
      isGroup: { $ne: true },
    })
      .populate("participants", "username")
      .sort({ updatedAt: -1 })
      .lean();

    // Batch unread count calculation using aggregation instead of N+1 queries
    const userId = session.user!.id!;
    const chatIds = chats.map((c) => c._id);

    // Build per-chat lastRead timestamps
    const lastReadMap = new Map<string, Date>();
    for (const chat of chats) {
      let lastRead = new Date(0);
      if (chat.lastReadBy) {
        if (typeof chat.lastReadBy.get === "function") {
          lastRead = chat.lastReadBy.get(userId) || new Date(0);
        } else {
          lastRead = (chat.lastReadBy as unknown as Record<string, Date>)[userId] || new Date(0);
        }
      }
      lastReadMap.set(chat._id.toString(), lastRead);
    }

    // Single aggregation for all unread counts
    const unreadCounts = chatIds.length > 0
      ? await Message.aggregate([
          {
            $match: {
              chatId: { $in: chatIds },
              senderId: { $ne: new (await import("mongoose")).default.Types.ObjectId(userId) },
            },
          },
          {
            $group: {
              _id: "$chatId",
              messages: { $push: { createdAt: "$createdAt" } },
            },
          },
        ])
      : [];

    // Count unread per chat based on lastRead
    const unreadMap = new Map<string, number>();
    for (const item of unreadCounts) {
      const chatIdStr = item._id.toString();
      const lastRead = lastReadMap.get(chatIdStr) || new Date(0);
      const count = item.messages.filter((m: { createdAt: Date }) => m.createdAt > lastRead).length;
      unreadMap.set(chatIdStr, count);
    }

    const chatsWithUnread = chats.map((chat) => ({
      ...chat,
      unreadCount: unreadMap.get(chat._id.toString()) || 0,
    }));

    return NextResponse.json(chatsWithUnread);
  } catch (error) {
    logger.error("Failed to fetch chats", { error: String(error) });
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const parsed = createChatSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { username } = parsed.data;

    await dbConnect();

    const otherUser = await User.findOne({ username });
    if (!otherUser) {
      return notFoundResponse("User");
    }

    if (otherUser._id.toString() === session.user.id) {
      return errorResponse("Cannot chat with yourself", 400);
    }

    const existingChat = await Chat.findOne({
      participants: { $all: [session.user.id, otherUser._id] },
      isGroup: { $ne: true },
    });

    if (existingChat) {
      await existingChat.populate("participants", "username");
      return NextResponse.json(existingChat);
    }

    const chat = await Chat.create({
      participants: [session.user.id, otherUser._id],
      isGroup: false,
      createdBy: session.user.id,
    });

    await chat.populate("participants", "username");

    logger.info("Chat created", { chatId: chat._id.toString(), participants: [session.user.id, otherUser._id.toString()] });

    return NextResponse.json(chat);
  } catch (error) {
    logger.error("Failed to create chat", { error: String(error) });
    return serverErrorResponse();
  }
}
