import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { updateUserSchema } from "@/lib/validations";
import {
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    await dbConnect();

    // Ensure models are registered
    Comment;

    const user = await User.findById(userId).select(
      "username profilePicture createdAt"
    );
    if (!user) {
      return notFoundResponse("User");
    }

    const blogs = await Blog.find({ authorId: userId })
      .populate("authorId", "username profilePicture")
      .populate({
        path: "comments",
        populate: { path: "authorId", select: "username profilePicture" },
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      user,
      blogs,
    });
  } catch (error) {
    logger.error("Failed to fetch user profile", { error: String(error) });
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
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    await dbConnect();

    const updates: Record<string, any> = {};
    if (parsed.data.username) {
      updates.username = parsed.data.username;
    }
    if ("profilePictureUrl" in body) {
      updates.profilePicture = body.profilePictureUrl;
      updates.profilePicturePublicId = body.profilePicturePublicId;
    }

    const user = await User.findByIdAndUpdate(session.user.id, updates, {
      new: true,
    }).select("username profilePicture email");

    logger.info("User updated", { userId: session.user.id });

    return NextResponse.json(user);
  } catch (error) {
    logger.error("Failed to update user", { error: String(error) });
    return serverErrorResponse();
  }
}
