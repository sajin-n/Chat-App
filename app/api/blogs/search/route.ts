import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Blog } from "@/lib/models/Blog";
import { escapeRegex } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2 || query.length > 100) {
        return NextResponse.json({ blogs: [] });
    }

    await dbConnect();

    try {
        const safeQuery = escapeRegex(query);
        const blogs = await Blog.find({
            content: { $regex: safeQuery, $options: "i" },
        })
            .populate("authorId", "username profilePicture")
            .sort({ createdAt: -1 })
            .limit(10);

        return NextResponse.json({ blogs });
    } catch (error) {
        console.error("Blog search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
