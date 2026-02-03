import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Report } from "@/lib/models/Report";

//GET all reports with populated data
export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const reports = await Report.find()
            .populate("reporterId", "username email")
            .sort({ createdAt: -1 })
            .lean();

        // Manually populate reported items based on type
        const populatedReports = await Promise.all(
            reports.map(async (report) => {
                let reportedItem = null;

                try {
                    const Model =
                        report.reportedType === "user" ? require("@/lib/models/User").User :
                            report.reportedType === "post" ? require("@/lib/models/Blog").Blog :
                                require("@/lib/models/Comment").Comment;

                    const item = await Model.findById(report.reportedId).lean();

                    if (item) {
                        reportedItem = {
                            _id: item._id.toString(),
                            ...(report.reportedType === "user" && {
                                username: item.username,
                                email: item.email,
                            }),
                            ...(report.reportedType === "post" && {
                                content: item.content?.substring(0, 100) + "...",
                            }),
                            ...(report.reportedType === "comment" && {
                                content: item.content,
                            }),
                        };
                    }
                } catch (e) {
                    // Item might be deleted
                    reportedItem = { deleted: true };
                }

                return {
                    _id: report._id.toString(),
                    reporter: report.reporterId ? {
                        _id: (report.reporterId as any)._id.toString(),
                        username: (report.reporterId as any).username,
                        email: (report.reporterId as any).email,
                    } : null,
                    reportedType: report.reportedType,
                    reportedId: report.reportedId.toString(),
                    reportedItem,
                    reason: report.reason,
                    description: report.description,
                    status: report.status,
                    createdAt: report.createdAt,
                };
            })
        );

        return NextResponse.json({ reports: populatedReports });
    } catch (error) {
        console.error("Admin reports fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }
}
