import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");

    // Protect root and dashboard routes
    // Exclude api routes from logic usually
    const isProtectedPage = req.nextUrl.pathname === "/" ||
        req.nextUrl.pathname.startsWith("/dashboard") ||
        req.nextUrl.pathname.startsWith("/groups") ||
        req.nextUrl.pathname.startsWith("/chat");

    // Create response with security and cache-control headers
    const createResponse = (response: NextResponse) => {
        // Apply strict no-cache headers to prevent browser from caching authenticated pages
        response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");
        response.headers.set("Surrogate-Control", "no-store");
        // Security headers
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("X-XSS-Protection", "1; mode=block");
        response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        return response;
    };

    if (isAuthPage) {
        if (isLoggedIn) {
            const redirectUrl = new URL("/", req.url);
            const response = NextResponse.redirect(redirectUrl);
            return createResponse(response);
        }
        // For auth pages, still apply cache headers to prevent caching
        return createResponse(NextResponse.next());
    }

    if (isProtectedPage) {
        if (!isLoggedIn) {
            const loginUrl = new URL("/login", req.url);
            // Store the original URL they were trying to access
            loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
            const response = NextResponse.redirect(loginUrl);
            return createResponse(response);
        }
    }

    return createResponse(NextResponse.next());
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
