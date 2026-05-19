import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

const publicRoutes = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow public routes
  const isPublicRoute = publicRoutes.some((route) => path === route);

  // Decrypt session from cookie
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  // Redirect unauthenticated users to /login
  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Redirect authenticated users away from /login
  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
