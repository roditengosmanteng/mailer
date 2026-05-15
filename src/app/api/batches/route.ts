import { prisma } from "@/lib/prisma";

export async function GET() {
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { emails: true },
      },
    },
  });

  return Response.json({ batches });
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

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
