import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Chat } from "@/lib/models/Chat";
import { Message } from "@/lib/models/Message";
import { User } from "@/lib/models/User";
import { updateGroupSchema } from "@/lib/validations";
import { validationErrorResponse, unauthorizedResponse, notFoundResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// Get group details
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

    await dbConnect();

    const group = await Chat.findOne({
      _id: groupId,
      isGroup: true,
      participants: session.user.id,
    })
      .populate("participants", "username")
      .populate("admins", "username")
      .populate("createdBy", "username");

    if (!group) {
      return notFoundResponse("Group");
    }

    return NextResponse.json(group);
  } catch (error) {
    logger.error("Failed to get group", { error: String(error) });
    return serverErrorResponse();
  }
}

// Update group (name, add/remove members)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { groupId } = await params;

    const body = await req.json();
    const parsed = updateGroupSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { name, addUsernames, removeUserIds } = parsed.data;

    await dbConnect();

    const group = await Chat.findOne({
      _id: groupId,
      isGroup: true,
      participants: session.user.id,
    });

    if (!group) {
      return notFoundResponse("Group");
    }

    // Only admins can modify group
    const isAdmin = group.admins.some((a: { toString: () => string }) => a.toString() === session.user!.id);
    if (!isAdmin) {
      return errorResponse("Only admins can modify the group", 403);
    }

    // Update name if provided
    if (name) {
      group.name = name;
    }

    // Add new members
    if (addUsernames && addUsernames.length > 0) {
      const usersToAdd = await User.find({ username: { $in: addUsernames } });
      
      // Check for invalid usernames (not found)
      const foundUsernames = usersToAdd.map(u => u.username);
      const invalidUsernames = addUsernames.filter(u => !foundUsernames.includes(u));
      if (invalidUsernames.length > 0) {
        return errorResponse(`User(s) not found: ${invalidUsernames.join(", ")}`, 400);
      }
      
      // Check for users already in group
      const alreadyInGroup: string[] = [];
      for (const user of usersToAdd) {
        if (group.participants.some((p: { toString: () => string }) => p.toString() === user._id.toString())) {
          alreadyInGroup.push(user.username);
        }
      }
      if (alreadyInGroup.length > 0) {
        return errorResponse(`User(s) already in group: ${alreadyInGroup.join(", ")}`, 400);
      }
      
      // Add users to group
      for (const user of usersToAdd) {
        group.participants.push(user._id);
      }
    }

    // Remove members
    if (removeUserIds && removeUserIds.length > 0) {
      // Cannot remove the creator
      const creatorId = group.createdBy.toString();
      for (const userId of removeUserIds) {
        if (userId === creatorId) continue;
        group.participants = group.participants.filter(
          (p: { toString: () => string }) => p.toString() !== userId
        );
        group.admins = group.admins.filter(
          (a: { toString: () => string }) => a.toString() !== userId
        );
      }
    }

    group.updatedAt = new Date();
    await group.save();

    await group.populate("participants", "username");
    await group.populate("admins", "username");

    logger.info("Group updated", { groupId, userId: session.user.id });

    return NextResponse.json(group);
  } catch (error) {
    logger.error("Failed to update group", { error: String(error) });
    return serverErrorResponse();
  }
}

// Delete group (only creator can delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { groupId } = await params;

    await dbConnect();

    const group = await Chat.findOne({
      _id: groupId,
      isGroup: true,
      participants: session.user.id,
    });

    if (!group) {
      return notFoundResponse("Group");
    }

    // Only creator can delete
    if (group.createdBy.toString() !== session.user.id) {
      return errorResponse("Only the group creator can delete it", 403);
    }

    // Delete all messages
    await Message.deleteMany({ chatId: groupId });

    // Delete group
    await Chat.deleteOne({ _id: groupId });

    logger.info("Group deleted", { groupId, userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete group", { error: String(error) });
    return serverErrorResponse();
  }
}
