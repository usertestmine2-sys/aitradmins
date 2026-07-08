import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enforceRateLimit, clientKey } from "@/modules/security";

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith("/api/v1")) {
    try {
      const key = clientKey(request, "api");
      // 100 requests per 60 seconds
      enforceRateLimit(key, 100, 60000);
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/v1/:path*",
};
