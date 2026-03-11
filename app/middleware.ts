import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const runtime = 'edge'; // Explicitly set to Edge Runtime

/**
 * Edge Middleware — runs on Cloudflare Workers (no database access).
 * Uses the JWT session cookie (strategy: 'jwt') to protect routes.
 * This replaces the Node.js segment middleware Next.js 16 auto-generates
 * from layout-level auth checks, which is incompatible with Cloudflare.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Protect /dashboard and /superadmin routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/superadmin")) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Protect all dashboard and superadmin routes at the edge
  matcher: ['/dashboard/:path*', '/superadmin/:path*'],
};
