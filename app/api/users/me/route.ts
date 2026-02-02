import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
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
