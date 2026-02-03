import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";

// GET all users with their posts count
export async function GET(req: NextRequest) {
    const session = await auth();

    // Check if developer
    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const users = await User.find()
            .select("_id username email profilePicture createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // Get post counts for each user
        const usersWithPosts = await Promise.all(
            users.map(async (user) => {
                const postCount = await Blog.countDocuments({ authorId: user._id });
                return {
                    ...user,
                    _id: user._id.toString(),
                    postCount,
                };
            })
        );

        return NextResponse.json({ users: usersWithPosts });
    } catch (error) {
        console.error("Admin users fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
