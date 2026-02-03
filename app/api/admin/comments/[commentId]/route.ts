import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Comment } from "@/lib/models/Comment";
import { Blog } from "@/lib/models/Blog";

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
        console.error("Admin comment delete error:", error);
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}
