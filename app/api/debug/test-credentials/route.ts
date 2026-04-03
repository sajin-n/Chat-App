import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";

export async function POST(req: NextRequest) {
  // This is a debug-only endpoint for testing auth, should be removed before production
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    console.log("\n=== DEBUG AUTH TEST ===");
    console.log("Testing email:", email);

    await dbConnect();
    console.log("✓ Database connected");

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    console.log("User found:", !!user);

    if (!user) {
      console.log("✗ User not found in database");
      return NextResponse.json({ error: "User not found", email }, { status: 404 });
    }

    console.log("User data:");
    console.log("- ID:", user._id);
    console.log("- Email:", user.email);
    console.log("- Username:", user.username);
    console.log("- Password hash exists:", !!user.password);
    console.log("- Password hash length:", user.password?.length);

    console.log("\nTesting password comparison...");
    console.log("- Input password length:", password.length);
    console.log("- Input password:", password);

    const isValid = await bcrypt.compare(password, user.password);
    console.log("- Comparison result:", isValid);

    if (!isValid) {
      console.log("✗ Password mismatch");
      return NextResponse.json(
        { error: "Invalid password", email, passwordTest: false },
        { status: 401 }
      );
    }

    console.log("✓ Password valid");
    console.log("=== TEST PASSED ===\n");

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Debug auth error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
