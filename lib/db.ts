import mongoose, { Mongoose } from "mongoose";

declare global {
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Connection pool sized for 20-30 concurrent users
      maxPoolSize: 20,
      minPoolSize: 2,
      // Timeouts to prevent hanging requests
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // Keep connections alive
      heartbeatFrequencyMS: 10000,
      // Buffer commands until connection is ready (don't fail immediately)
      bufferCommands: true,
      // Auto-create indexes in development
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset promise on failure so next call retries
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default dbConnect;
