import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Chat } from "@/lib/models/Chat";
import { User } from "@/lib/models/User";
import { createGroupSchema } from "@/lib/validations";
import { validationErrorResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// Get all groups for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();

    const groups = await Chat.find({
      isGroup: true,
      participants: session.user.id,
    })
      .populate("participants", "username")
      .populate("admins", "username")
      .populate("createdBy", "username")
      .sort({ updatedAt: -1 });

    return NextResponse.json(groups);
  } catch (error) {
    logger.error("Failed to fetch groups", { error: String(error) });
    return serverErrorResponse();
  }
}

// Create new group
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { name, usernames } = parsed.data;

    await dbConnect();

    // Find all users by username
    const users = await User.find({ username: { $in: usernames } });
    
    if (users.length === 0) {
      return notFoundResponse("Users");
    }

    const participantIds = [
      session.user.id,
      ...users.map((u) => u._id.toString()),
    ];

    // Remove duplicates
    const uniqueParticipants = [...new Set(participantIds)];

    const group = await Chat.create({
      name,
      isGroup: true,
      participants: uniqueParticipants,
      admins: [session.user.id],
      createdBy: session.user.id,
    });

    await group.populate("participants", "username");
    await group.populate("admins", "username");

    logger.info("Group created", { groupId: group._id.toString(), name, createdBy: session.user.id });

    return NextResponse.json(group);
  } catch (error) {
    logger.error("Failed to create group", { error: String(error) });
    return serverErrorResponse();
  }
}
