import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Allow access to login page and API routes
  if (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Check for access token in cookies
  const hasAccess = request.cookies.get("formulamind_access");

  if (!hasAccess) {
    // Redirect to login page if no access token
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
