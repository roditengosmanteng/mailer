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
 * Returns { user } on success, or { error: Response } on failure.
 */
export async function requireAuth(): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

/**
 * Require admin role for an API route.
 * Returns { user } on success, or { error: Response } on failure.
 */
export async function requireAdmin(): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: Response }
> {
  const result = await requireAuth();
  if (result.error) return result;

  if (result.user.role !== "admin") {
    return {
      error: Response.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      ),
    };
  }
  return { user: result.user };
}
