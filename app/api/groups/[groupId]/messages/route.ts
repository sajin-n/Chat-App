import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Message } from "@/lib/models/Message";
import { Chat } from "@/lib/models/Chat";
import { sendMessageSchema, paginationSchema } from "@/lib/validations";
import { validationErrorResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { groupId } = await params;
    const { searchParams } = new URL(req.url);

    const parsed = paginationSchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { limit, cursor } = parsed.data;

    await dbConnect();

    const group = await Chat.findOne({
      _id: groupId,
      isGroup: true,
      participants: session.user.id,
    });

    if (!group) {
      return notFoundResponse("Group");
    }

    const query: Record<string, unknown> = { chatId: groupId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .populate("senderId", "username")
      .populate({
        path: "replyTo",
        select: "content senderId",
        populate: { path: "senderId", select: "username" }
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0]?.createdAt?.toISOString() : null,
    });
  } catch (error) {
    logger.error("Failed to fetch group messages", { error: String(error) });
    return serverErrorResponse();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const rateLimitResult = checkRateLimit(req, "message");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many messages, slow down" },
        { status: 429 }
      );
    }

    const { groupId } = await params;
    const body = await req.json();

    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { content, clientId, replyToId } = parsed.data;

    await dbConnect();

    const group = await Chat.findOne({
      _id: groupId,
      isGroup: true,
      participants: session.user.id,
    });

    if (!group) {
      return notFoundResponse("Group");
    }

    // Check for duplicate message
    if (clientId) {
      const existingMessage = await Message.findOne({ chatId: groupId, clientId });
      if (existingMessage) {
        await existingMessage.populate("senderId", "username");
        return NextResponse.json(existingMessage);
      }
    }

    const message = await Message.create({
      chatId: groupId,
      senderId: new mongoose.Types.ObjectId(session.user.id),
      content,
      clientId,
      ...(replyToId && { replyTo: replyToId }),
    });

    await message.populate("senderId", "username");

    // Update group's last message
    await Chat.updateOne(
      { _id: groupId },
      { lastMessage: content.substring(0, 100), updatedAt: new Date() }
    );

    return NextResponse.json(message);
  } catch (error) {
    logger.error("Failed to send group message", { error: String(error) });
    return serverErrorResponse();
  }
}
