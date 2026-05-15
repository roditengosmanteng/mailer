import { prisma } from "@/lib/prisma";

export async function GET() {
  const providers = await prisma.aIProvider.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      model: true,
      baseUrl: true,
      isActive: true,
      createdAt: true,
    },
  });

  return Response.json({ providers });
}

export async function POST(request: Request) {
  try {
    const { name, type, apiKey, model, baseUrl } = await request.json();

    if (!name || !type || !apiKey || !model) {
      return Response.json(
        { error: "Name, type, API key, and model are required" },
        { status: 400 }
      );
    }

    const provider = await prisma.aIProvider.create({
      data: { name, type, apiKey, model, baseUrl: baseUrl || null },
    });

    return Response.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        model: provider.model,
        isActive: provider.isActive,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: `Failed to create provider: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.aIProvider.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error: `Failed to delete provider: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    const provider = await prisma.aIProvider.update({
      where: { id },
      data,
    });
    return Response.json({ success: true, provider });
  } catch (error) {
    return Response.json(
      {
        error: `Failed to update provider: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
