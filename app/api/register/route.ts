import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { registerSchema } from "@/lib/validations";
import { validationErrorResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "auth");
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { username, email, password } = parsed.data;

    await dbConnect();

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return errorResponse("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    logger.info("User registered", { userId: user._id.toString(), username });

    return NextResponse.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    logger.error("Registration error", { error: String(error) });
    return serverErrorResponse();
  }
}
