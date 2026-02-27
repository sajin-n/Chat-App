import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";
import { logger } from "@/lib/logger";

// GET all users with their posts count
export async function GET(req: NextRequest) {
    const session = await auth();

    // Check if developer
    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        // Use aggregation to get post counts in a single query instead of N+1
        const postCounts = await Blog.aggregate([
            { $group: { _id: "$authorId", count: { $sum: 1 } } },
        ]);
        const postCountMap = new Map(
            postCounts.map((pc: { _id: mongoose.Types.ObjectId; count: number }) => [pc._id.toString(), pc.count])
        );

        const users = await User.find()
            .select("_id username email profilePicture createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const usersWithPosts = users.map((user) => ({
            ...user,
            _id: user._id.toString(),
            postCount: postCountMap.get(user._id.toString()) || 0,
        }));

        return NextResponse.json({ users: usersWithPosts });
    } catch (error) {
        logger.error("Admin users fetch error", { error: String(error) });
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
