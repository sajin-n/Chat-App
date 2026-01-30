import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Chat } from "@/lib/models/Chat";
import { User } from "@/lib/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const chats = await Chat.find({
    participants: session.user.id,
  })
    .populate("participants", "username")
    .sort({ updatedAt: -1 });

  return NextResponse.json(chats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json();

  if (!username) {
    return NextResponse.json(
      { error: "Username required" },
      { status: 400 }
    );
  }

  await dbConnect();

  const otherUser = await User.findOne({ username });
  if (!otherUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (otherUser._id.toString() === session.user.id) {
    return NextResponse.json(
      { error: "Cannot chat with yourself" },
      { status: 400 }
    );
  }

  const existingChat = await Chat.findOne({
    participants: { $all: [session.user.id, otherUser._id] },
  });

  if (existingChat) {
    return NextResponse.json(existingChat);
  }

  const chat = await Chat.create({
    participants: [session.user.id, otherUser._id],
  });

  await chat.populate("participants", "username");

  return NextResponse.json(chat);
}
