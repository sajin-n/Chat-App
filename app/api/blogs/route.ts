import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import { createBlogSchema, paginationSchema } from "@/lib/validations";
import {
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const parsed = paginationSchema.safeParse({
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    });

    const { limit, cursor } = parsed.success
      ? parsed.data
      : { limit: 50, cursor: undefined };

    await dbConnect();

    // Ensure Comment and User models are registered
    Comment;
    User;

    const query: Record<string, unknown> = {};
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const blogs = await Blog.find(query)
      .populate("authorId", "username profilePicture")
      .populate({
        path: "comments",
        populate: { path: "authorId", select: "username profilePicture" },
      })
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = blogs.length > limit;
    const results = hasMore ? blogs.slice(0, -1) : blogs;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    return NextResponse.json({
      blogs: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error("Failed to fetch blogs", { error: String(error) });
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const parsed = createBlogSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { content } = parsed.data;

    await dbConnect();

    // Ensure models are registered
    Comment;
    User;

    const blog = await Blog.create({
      authorId: session.user.id,
      content,
      imageUrl: body.imageUrl,
      imagePublicId: body.imagePublicId,
    });

    await blog.populate("authorId", "username profilePicture");

    logger.info("Blog created", { blogId: blog._id.toString() });

    return NextResponse.json(blog);
  } catch (error) {
    logger.error("Failed to create blog", { error: String(error) });
    return serverErrorResponse();
  }
}
