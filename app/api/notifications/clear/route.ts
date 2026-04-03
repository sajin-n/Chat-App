import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Notification } from "@/lib/models/Notification";
import { apiResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse(null, "Unauthorized", 401);
    }

    await dbConnect();

    const result = await Notification.updateMany(
      { recipientId: session.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
        },
        message: "All notifications marked as read",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_MARK_ALL_READ]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse(null, "Unauthorized", 401);
    }

    await dbConnect();

    const result = await Notification.deleteMany({
      recipientId: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          deletedCount: result.deletedCount,
        },
        message: "All notifications cleared",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_CLEAR_ALL]", error);
    return apiResponse(null, "Internal server error", 500);
  }
}
