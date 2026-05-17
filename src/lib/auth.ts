import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Require authentication for an API route.
 * Returns the user or throws a 401 Response.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Require admin role for an API route.
 * Returns the user or throws a 403 Response.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
