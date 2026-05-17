import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "batches"; // "batches" or "emails"

  const where: Record<string, unknown> = {
    deletedAt: { not: null },
  };
  
  if (user) {
    where.userId = user.id;
  }

  if (type === "batches") {
    const batches = await prisma.importBatch.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      include: {
        _count: {
          select: { emails: true },
        },
      },
    });

    return Response.json({
      batches: batches.map(b => ({
        ...b,
        totalCount: b._count.emails
      }))
    });
  } else {
    const emails = await prisma.email.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      take: 100,
      include: { batch: true },
    });

    return Response.json({ emails });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  try {
    const { type, id } = await request.json(); // type: "batch" | "email"
    if (!id || !type) return Response.json({ error: "Missing parameters" }, { status: 400 });

    const where: any = { id };
    if (user) where.userId = user.id;

    if (type === "batch") {
      await prisma.importBatch.update({ where, data: { deletedAt: null } });
      await prisma.email.updateMany({
        where: { batchId: id },
        data: { deletedAt: null }
      });
    } else {
      await prisma.email.update({ where, data: { deletedAt: null } });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to restore" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  try {
    const { type, id } = await request.json(); // type: "batch" | "email" | "all"
    
    if (type === "all") {
      const whereUser = user ? { userId: user.id } : {};
      await prisma.email.deleteMany({ where: { deletedAt: { not: null }, ...whereUser } });
      await prisma.importBatch.deleteMany({ where: { deletedAt: { not: null }, ...whereUser } });
      return Response.json({ success: true });
    }

    if (!id || !type) return Response.json({ error: "Missing parameters" }, { status: 400 });

    const where: any = { id };
    if (user) where.userId = user.id;

    if (type === "batch") {
      await prisma.email.deleteMany({ where: { batchId: id } }); // hard delete associated emails
      await prisma.importBatch.delete({ where }); // hard delete batch
    } else {
      await prisma.email.delete({ where }); // hard delete email
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to permanently delete" }, { status: 500 });
  }
}
