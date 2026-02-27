import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { escapeRegex, serverErrorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2 || query.length > 50) {
      return NextResponse.json({ users: [] });
    }

    await dbConnect();

    const safeQuery = escapeRegex(query);
    const users = await User.find({
      username: { $regex: safeQuery, $options: "i" },
      _id: { $ne: session.user.id },
    })
      .select("username profilePicture")
      .limit(10);

    return NextResponse.json({ users });
  } catch (error) {
    return serverErrorResponse();
  }
}
