import { NextResponse } from "next/server";
import { ZodError, ZodIssue } from "zod";

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export function errorResponse(message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status });
}

export function validationErrorResponse(error: ZodError): NextResponse<ApiError> {
  const details: Record<string, string[]> = {};
  error.issues.forEach((err: ZodIssue) => {
    const path = err.path.join(".");
    if (!details[path]) details[path] = [];
    details[path].push(err.message);
  });
  return NextResponse.json(
    { error: "Validation failed", details },
    { status: 400 }
  );
}

export function unauthorizedResponse(): NextResponse<ApiError> {
  return errorResponse("Unauthorized", 401);
}

export function notFoundResponse(resource = "Resource"): NextResponse<ApiError> {
  return errorResponse(`${resource} not found`, 404);
}

export function serverErrorResponse(): NextResponse<ApiError> {
  return errorResponse("Internal server error", 500);
}
