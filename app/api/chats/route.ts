import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Chat } from "@/lib/models/Chat";
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
    })
      .populate("participants", "username")
      .sort({ updatedAt: -1 });

    return NextResponse.json(chats);
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
    });

    if (existingChat) {
      await existingChat.populate("participants", "username");
      return NextResponse.json(existingChat);
    }

    const chat = await Chat.create({
      participants: [session.user.id, otherUser._id],
    });

    await chat.populate("participants", "username");

    logger.info("Chat created", { chatId: chat._id.toString(), participants: [session.user.id, otherUser._id.toString()] });

    return NextResponse.json(chat);
  } catch (error) {
    logger.error("Failed to create chat", { error: String(error) });
    return serverErrorResponse();
  }
}
