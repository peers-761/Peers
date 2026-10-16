import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionValue } from "./lib/auth";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = cookie ? readSessionValue(cookie) : null;

  if (pathname.startsWith("/admin/dashboard")) {
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  if (pathname.startsWith("/teacher/dashboard") || pathname.startsWith("/teacher/self-attendance")) {
    if (!session || session.role !== "teacher") {
      return NextResponse.redirect(new URL("/teacher", req.url));
    }
  }

  if (pathname.startsWith("/parent/dashboard")) {
    if (!session || session.role !== "parent") {
      const loginUrl = new URL("/parent", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/incharge/dashboard")) {
    if (!session || session.role !== "incharge") {
      return NextResponse.redirect(new URL("/incharge", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/teacher/dashboard/:path*",
    "/teacher/self-attendance/:path*",
    "/parent/dashboard/:path*",
    "/incharge/dashboard/:path*",
  ],
};
