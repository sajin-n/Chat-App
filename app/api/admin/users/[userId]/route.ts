import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import { Chat } from "@/lib/models/Chat";
import { Message } from "@/lib/models/Message";

// GET user details with all their posts
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    await dbConnect();

    try {
        console.log("[Admin] Fetching user:", userId);

        const user = await User.findById(userId)
            .select("_id username email profilePicture createdAt")
            .lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Convert userId to ObjectId for proper query
        const userObjectId = new mongoose.Types.ObjectId(userId);

        console.log("[Admin] Finding posts for user ObjectId:", userObjectId);

        const posts = await Blog.find({ authorId: userObjectId })
            .sort({ createdAt: -1 })
            .lean();

        console.log("[Admin] Found posts:", posts.length);

        return NextResponse.json({
            user: { ...user, _id: user._id.toString() },
            posts: posts.map((post) => ({
                _id: post._id.toString(),
                content: post.content,
                imageUrl: post.imageUrl,
                createdAt: post.createdAt,
                commentCount: post.comments?.length || 0,
                likeCount: post.likes?.length || 0,
            })),
        });
    } catch (error) {
        console.error("Admin user fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

// DELETE a user and all their data
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    await dbConnect();

    try {
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Delete user's posts
        await Blog.deleteMany({ authorId: userObjectId });

        // Delete user's comments
        await Comment.deleteMany({ authorId: userObjectId });

        // Delete user's messages
        await Message.deleteMany({ senderId: userObjectId });

        // Remove user from chats (participants and admins)
        await Chat.updateMany(
            { participants: userObjectId },
            {
                $pull: {
                    participants: userObjectId,
                    admins: userObjectId
                }
            }
        );

        // Delete chats with no remaining participants
        await Chat.deleteMany({ participants: { $size: 0 } });

        // Delete the user
        await User.findByIdAndDelete(userId);

        return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Admin user delete error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
