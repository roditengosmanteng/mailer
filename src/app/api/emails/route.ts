import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const batchId = searchParams.get("batchId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (batchId) where.batchId = batchId;
  if (status) where.status = status;

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { batch: true },
    }),
    prisma.email.count({ where }),
  ]);

  return Response.json({
    emails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids)) {
    return Response.json({ error: "Invalid email IDs" }, { status: 400 });
  }

  await prisma.email.deleteMany({ where: { id: { in: ids } } });

  return Response.json({ success: true, deleted: ids.length });
}
