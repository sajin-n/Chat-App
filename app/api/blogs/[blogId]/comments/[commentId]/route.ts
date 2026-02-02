import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  badRequestResponse,
  errorResponse,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { blogId, commentId } = await params;
    const body = await req.json();

    await dbConnect();

    // Ensure models are registered
    Blog;
    User;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return notFoundResponse("Comment");
    }

    // Check if user is the comment author
    if (comment.authorId.toString() !== session.user.id) {
      return errorResponse("Unauthorized", 403);
    }

    if ("content" in body) {
      if (typeof body.content !== "string" || !body.content.trim()) {
        return badRequestResponse("Content cannot be empty");
      }

      comment.content = body.content.trim();
      await comment.save();
    }

    await comment.populate("authorId", "username profilePicture");

    logger.info("Comment updated", { commentId });

    return NextResponse.json(comment);
  } catch (error) {
    logger.error("Failed to update comment", { error: String(error) });
    return serverErrorResponse();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { blogId, commentId } = await params;

    await dbConnect();

    // Ensure models are registered
    User;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return notFoundResponse("Comment");
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return notFoundResponse("Blog");
    }

    // Check permissions: comment author or blog author can delete
    const isCommentAuthor = comment.authorId.toString() === session.user.id;
    const isBlogAuthor = blog.authorId.toString() === session.user.id;

    if (!isCommentAuthor && !isBlogAuthor) {
      return errorResponse("Unauthorized", 403);
    }

    // Remove comment from blog's comments array
    blog.comments = blog.comments.filter(
      (id) => id.toString() !== commentId
    );
    await blog.save();

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    logger.info("Comment deleted", { commentId, blogId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete comment", { error: String(error) });
    return serverErrorResponse();
  }
}