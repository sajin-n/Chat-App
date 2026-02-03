import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Report } from "@/lib/models/Report";
import { User } from "@/lib/models/User";
import { Blog } from "@/lib/models/Blog";
import { Comment } from "@/lib/models/Comment";
import mongoose from "mongoose";

// POST - Create a new report
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { reportedType, reportedId, reason, description } = body;

        // Validate inputs
        if (!reportedType || !reportedId || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["user", "post", "comment"].includes(reportedType)) {
            return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
        }

        await dbConnect();

        const reportedObjectId = new mongoose.Types.ObjectId(reportedId);

        // Verify reported item exists
        let itemExists = false;
        switch (reportedType) {
            case "user":
                itemExists = !!(await User.findById(reportedObjectId));
                break;
            case "post":
                itemExists = !!(await Blog.findById(reportedObjectId));
                break;
            case "comment":
                itemExists = !!(await Comment.findById(reportedObjectId));
                break;
        }

        if (!itemExists) {
            return NextResponse.json({ error: "Reported item not found" }, { status: 404 });
        }

        // Create report
        const report = await Report.create({
            reporterId: new mongoose.Types.ObjectId(session.user.id),
            reportedType,
            reportedId: reportedObjectId,
            reason,
            description: description || "",
            status: "pending",
        });

        return NextResponse.json({
            message: "Report submitted successfully",
            reportId: report._id.toString(),
        });
    } catch (error) {
        console.error("Report creation error:", error);
        return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }
}
