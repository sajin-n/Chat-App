import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await dbConnect();
    
    // Verify database is actually responsive
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not initialized");
    }
    await db.admin().ping();
    
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
