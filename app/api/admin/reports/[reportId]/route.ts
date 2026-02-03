import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Report } from "@/lib/models/Report";

// PATCH - Update report status
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["pending", "resolved"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();

    try {
        const report = await Report.findByIdAndUpdate(
            reportId,
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, report });
    } catch (error) {
        console.error("Report status update error:", error);
        return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
    }
}

// DELETE - Delete a report
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;

    await dbConnect();

    try {
        const report = await Report.findByIdAndDelete(reportId);

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Report deleted successfully" });
    } catch (error) {
        console.error("Report delete error:", error);
        return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }
}
