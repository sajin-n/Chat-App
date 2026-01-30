import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Message } from "@/lib/models/Message";
import { Chat } from "@/lib/models/Chat";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before");

  await dbConnect();

  const chat = await Chat.findOne({
    _id: chatId,
    participants: session.user.id,
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const query: Record<string, unknown> = { chatId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .populate("senderId", "username")
    .sort({ createdAt: -1 })
    .limit(limit);

  return NextResponse.json(messages.reverse());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Message content required" },
      { status: 400 }
    );
  }

  await dbConnect();

  const chat = await Chat.findOne({
    _id: chatId,
    participants: session.user.id,
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const message = await Message.create({
    chatId,
    senderId: session.user.id,
    content: content.trim(),
  });

  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: content.trim().substring(0, 100),
    updatedAt: new Date(),
  });

  await message.populate("senderId", "username");

  return NextResponse.json(message);
}
