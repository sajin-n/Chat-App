import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";

// DELETE a post
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    await dbConnect();

    try {
        console.log("[Admin] Deleting post:", postId);

        const post = await Blog.findById(postId);

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        // Delete all comments on this post
        await Comment.deleteMany({ blogId: postId });

        // Also remove comment references from the blog's comments array
        // Then delete the post
        await Blog.findByIdAndDelete(postId);

        console.log("[Admin] Post deleted successfully:", postId);

        return NextResponse.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        console.error("Admin post delete error:", error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
