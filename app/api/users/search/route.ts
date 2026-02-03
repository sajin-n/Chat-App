import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  await dbConnect();

  const users = await User.find({
    username: { $regex: query, $options: "i" },
    _id: { $ne: session.user.id },
  })
    .select("username profilePicture")
    .limit(10);

  return NextResponse.json({ users });
}
