import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import { createCommentSchema } from "@/lib/validations";
import {
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(
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

    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { content } = parsed.data;

    await dbConnect();

    // Ensure models are registered
    Comment;
    User;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return notFoundResponse("Blog");
    }

    const comment = await Comment.create({
      blogId,
      authorId: session.user.id,
      content,
    });

    blog.comments.push(comment._id);
    await blog.save();

    await comment.populate("authorId", "username profilePicture");

    logger.info("Comment created", { commentId: comment._id.toString() });

    return NextResponse.json(comment);
  } catch (error) {
    logger.error("Failed to create comment", { error: String(error) });
    return serverErrorResponse();
  }
}
