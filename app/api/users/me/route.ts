import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { Chat } from "@/lib/models/Chat";
import { Message } from "@/lib/models/Message";
import { unauthorizedResponse, serverErrorResponse, badRequestResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select(
      "_id username email profilePicture"
    );

    return NextResponse.json(user);
  } catch (error) {
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { username, profilePictureUrl, profilePicturePublicId } = body;

    await dbConnect();

    const updateData: any = {};

    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        return badRequestResponse("Username cannot be empty");
      }
      if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
        return badRequestResponse("Username must be between 2 and 30 characters");
      }
      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username: trimmedUsername,
        _id: { $ne: session.user.id }
      });
      if (existingUser) {
        return badRequestResponse("Username is already taken");
      }
      updateData.username = trimmedUsername;
    }

    if (profilePictureUrl !== undefined) {
      updateData.profilePicture = profilePictureUrl;
    }

    if (profilePicturePublicId !== undefined) {
      updateData.profilePicturePublicId = profilePicturePublicId;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse("No valid fields to update");
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { new: true }
    ).select("username email profilePicture");

    if (!user) {
      return badRequestResponse("User not found");
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return serverErrorResponse();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();

    const userId = session.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Comprehensive cleanup before deleting user
    // 1. Delete user's blogs
    await Blog.deleteMany({ authorId: userObjectId });

    // 2. Delete user's comments
    await Comment.deleteMany({ authorId: userObjectId });

    // 3. Delete user's messages
    await Message.deleteMany({ senderId: userObjectId });

    // 4. Remove user from all chats (participants and admins)
    await Chat.updateMany(
      { participants: userObjectId },
      {
        $pull: {
          participants: userObjectId,
          admins: userObjectId
        }
      }
    );

    // 5. Delete chats with no remaining participants
    await Chat.deleteMany({ participants: { $size: 0 } });

    // 6. Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return badRequestResponse("User not found");
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return serverErrorResponse();
  }
}

