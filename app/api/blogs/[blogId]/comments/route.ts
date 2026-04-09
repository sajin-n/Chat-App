import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import { Notification } from "@/lib/models/Notification";
import { createCommentSchema } from "@/lib/validations";
import {
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  badRequestResponse,
  isValidObjectId,
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
    if (!isValidObjectId(blogId)) {
      return badRequestResponse("Invalid blog ID");
    }
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

    if (blog.authorId.toString() !== session.user.id) {
      const commenter = await User.findById(session.user.id).select("username profilePicture");
      
      await Notification.create({
        recipientId: blog.authorId.toString(),
        senderId: session.user.id,
        type: "comment",
        title: `${commenter?.username || "Someone"} commented on your post`,
        message: content.substring(0, 100),
        data: {
          blogId: blogId,
          commentId: comment._id.toString(),
        },
        actionUrl: `/blog/${blogId}`,
        read: false,
      });

      logger.info("Comment notification created", { blogId, authorId: blog.authorId.toString() });
    }

    await comment.populate("authorId", "username profilePicture");

    return NextResponse.json(comment);
  } catch (error) {
    logger.error("Failed to create comment", { error: String(error) });
    return serverErrorResponse();
  }
}
