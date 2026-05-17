import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  const where: Record<string, unknown> = {};
  if (user) where.userId = user.id;

  const batches = await prisma.importBatch.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  try {
    const { id, name } = await request.json();
    if (!id || !name?.trim()) {
      return Response.json({ error: "ID and name are required" }, { status: 400 });
    }

    // Verify ownership
    const batch = await prisma.importBatch.findFirst({
      where: { id, ...(user ? { userId: user.id } : {}) },
    });

    if (!batch) {
      return Response.json({ error: "Batch not found" }, { status: 404 });
    }

    const updated = await prisma.importBatch.update({
      where: { id },
      data: { name: name.trim() },
    });

    return Response.json({ batch: updated });
  } catch (error) {
    return Response.json(
      {
        error: `Failed to rename batch: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  try {
    const { id } = await request.json();

    // Verify ownership
    const batch = await prisma.importBatch.findFirst({
      where: { id, ...(user ? { userId: user.id } : {}) },
    });

    if (!batch) {
      return Response.json({ error: "Batch not found" }, { status: 404 });
    }

    await prisma.email.deleteMany({ where: { batchId: id } });
    await prisma.importBatch.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error: `Failed to delete batch: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
