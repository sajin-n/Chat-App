import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Notification } from "@/lib/models/Notification";
import { unauthorizedResponse, notFoundResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();
    const { notificationId } = await params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return notFoundResponse("Notification");
    }

    if (notification.recipientId.toString() !== session.user.id) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const { read } = body;

    if (read !== undefined) {
      notification.read = read;
      if (read) {
        notification.readAt = new Date();
      }
    }

    await notification.save();

    return NextResponse.json(
      {
        success: true,
        data: notification,
        message: "Notification updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[NOTIFICATION_PATCH]", error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await dbConnect();
    const { notificationId } = await params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return notFoundResponse("Notification");
    }

    if (notification.recipientId.toString() !== session.user.id) {
      return errorResponse("Forbidden", 403);
    }

    await Notification.findByIdAndDelete(notificationId);

    return NextResponse.json(
      {
        success: true,
        message: "Notification deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[NOTIFICATION_DELETE]", error);
    return serverErrorResponse();
  }
}
