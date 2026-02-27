import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Comment } from "@/lib/models/Comment";
import { Blog } from "@/lib/models/Blog";
import { isValidObjectId } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// DELETE a specific comment
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ commentId: string }> }
) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    if (!isValidObjectId(commentId)) {
        return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
    }

    await dbConnect();

    try {
        const commentObjectId = new mongoose.Types.ObjectId(commentId);

        // Get comment to find its blog
        const comment = await Comment.findById(commentObjectId);

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Remove comment from blog's comments array
        await Blog.findByIdAndUpdate(
            comment.blogId,
            { $pull: { comments: commentObjectId } }
        );

        // Delete the comment
        await Comment.findByIdAndDelete(commentObjectId);

        return NextResponse.json({ success: true, message: "Comment deleted successfully" });
    } catch (error) {
        logger.error("Admin comment delete error", { error: String(error) });
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}
