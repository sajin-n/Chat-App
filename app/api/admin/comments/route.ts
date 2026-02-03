import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";

// GET all comments with author and blog info
export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const comments = await Comment.find()
            .populate("authorId", "username email profilePicture")
            .populate("blogId", "content")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({
            comments: comments.map((comment) => ({
                _id: comment._id.toString(),
                content: comment.content,
                author: comment.authorId ? {
                    _id: (comment.authorId as any)._id.toString(),
                    username: (comment.authorId as any).username,
                    email: (comment.authorId as any).email,
                } : null,
                blog: comment.blogId ? {
                    _id: (comment.blogId as any)._id.toString(),
                    content: (comment.blogId as any).content?.substring(0, 100) + "...",
                } : null,
                likeCount: comment.likes?.length || 0,
                createdAt: comment.createdAt,
            })),
        });
    } catch (error) {
        console.error("Admin comments fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }
}
