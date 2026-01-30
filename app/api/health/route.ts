import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await dbConnect();
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error("Health check failed", { error: String(error) });
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
