import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Notification } from "@/lib/models/Notification";
import { unauthorizedResponse, badRequestResponse, serverErrorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return unauthorizedResponse();
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const query: any = { recipientId: session.user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipientId: session.user.id,
      read: false,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications,
          total,
          unreadCount,
          hasMore: skip + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();

    const body = await req.json();
    const { recipientId, type, title, message, senderId, data, actionUrl } = body;

    if (!recipientId || !type || !title || !message) {
      return badRequestResponse("Missing required fields");
    }

    const notification = new Notification({
      recipientId,
      senderId,
      type,
      title,
      message,
      data,
      actionUrl,
      read: false,
    });

    await notification.save();

    return NextResponse.json(
      {
        success: true,
        data: notification,
        message: "Notification created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return serverErrorResponse();
  }
}
