import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  errorResponse,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { blogId } = await params;

    await dbConnect();

    // Ensure models are registered
    Comment;
    User;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return notFoundResponse("Blog");
    }

    if (blog.authorId.toString() !== session.user.id) {
      return errorResponse("Unauthorized", 403);
    }

    // Delete all comments associated with the blog
    if (blog.comments.length > 0) {
      await Comment.deleteMany({ _id: { $in: blog.comments } });
    }

    await Blog.findByIdAndDelete(blogId);

    logger.info("Blog deleted", { blogId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete blog", { error: String(error) });
    return serverErrorResponse();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { blogId } = await params;
    const body = await req.json();

    await dbConnect();

    // Ensure models are registered
    Comment;
    User;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return notFoundResponse("Blog");
    }

    // Handle like/unlike
    if ("toggleLike" in body) {
      const userId = new Types.ObjectId(session.user.id);
      const likeIndex = blog.likes.findIndex(
        (id) => id.toString() === userId.toString()
      );

      if (likeIndex > -1) {
        blog.likes.splice(likeIndex, 1);
      } else {
        blog.likes.push(userId);
      }

      await blog.save();
    }

    // Handle content editing
    if ("content" in body) {
      if (blog.authorId.toString() !== session.user.id) {
        return errorResponse("Unauthorized", 403);
      }

      if (typeof body.content !== "string" || !body.content.trim()) {
        return errorResponse("Content cannot be empty", 400);
      }

      blog.content = body.content.trim();
      
      // Handle image updates if provided
      if ("imageUrl" in body) {
        blog.imageUrl = body.imageUrl;
      }
      if ("imagePublicId" in body) {
        blog.imagePublicId = body.imagePublicId;
      }

      await blog.save();
    }

    await blog.populate("authorId", "username profilePicture");
    await blog.populate({
      path: "comments",
      populate: { path: "authorId", select: "username profilePicture" },
    });

    return NextResponse.json(blog);
  } catch (error) {
    logger.error("Failed to update blog", { error: String(error) });
    return serverErrorResponse();
  }
}
