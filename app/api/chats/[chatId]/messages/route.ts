import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Message } from "@/lib/models/Message";
import { Chat } from "@/lib/models/Chat";
import { sendMessageSchema, paginationSchema } from "@/lib/validations";
import { validationErrorResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/api-response";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
    const { searchParams } = new URL(req.url);
    
    const parsed = paginationSchema.safeParse({
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    });

    const { limit, cursor } = parsed.success ? parsed.data : { limit: 50, cursor: undefined };

    await dbConnect();

    const chat = await Chat.findOne({
      _id: chatId,
      participants: session.user.id,
    });

    if (!chat) {
      return notFoundResponse("Chat");
    }

    const query: Record<string, unknown> = { chatId };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .populate("senderId", "username")
      .sort({ _id: -1 })
      .limit(limit + 1);

    // Mark messages as read for this user
    await Chat.updateOne(
      { _id: chatId },
      { $set: { [`lastReadBy.${session.user.id}`]: new Date() } }
    );

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    return NextResponse.json({
      messages: results.reverse(),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error("Failed to fetch messages", { error: String(error) });
    return serverErrorResponse();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const rateLimit = checkRateLimit(req, "message");
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { chatId } = await params;
    const body = await req.json();
    
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { content, clientId } = parsed.data;

    await dbConnect();

    const chat = await Chat.findOne({
      _id: chatId,
      participants: session.user.id,
    });

    if (!chat) {
      return notFoundResponse("Chat");
    }

    const message = await Message.create({
      chatId,
      senderId: session.user.id,
      content: content.trim(),
      clientId,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: content.trim().substring(0, 100),
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    });

    await message.populate("senderId", "username");

    return NextResponse.json({
      ...message.toObject(),
      status: "sent",
    });
  } catch (error) {
    logger.messageDeliveryFailure(
      (await params).chatId,
      "unknown",
      String(error)
    );
    return serverErrorResponse();
  }
}
