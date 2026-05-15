import { prisma } from "@/lib/prisma";
import { aiVerifyEmail } from "@/lib/ai-service";

export async function POST(request: Request) {
  try {
    const { emailIds, batchId, providerId } = await request.json();

    let emails;
    if (emailIds && Array.isArray(emailIds)) {
      emails = await prisma.email.findMany({
        where: { id: { in: emailIds } },
      });
    } else if (batchId) {
      emails = await prisma.email.findMany({
        where: {
          batchId,
          syntaxValid: true,
          status: { in: ["valid", "pending"] },
        },
      });
    } else {
      return Response.json(
        { error: "Provide emailIds or batchId" },
        { status: 400 }
      );
    }

    if (emails.length === 0) {
      return Response.json({
        success: true,
        verified: 0,
        message: "No emails to verify",
      });
    }

    const results = [];

    for (const email of emails) {
      const result = await aiVerifyEmail(email.address, providerId);

      const updated = await prisma.email.update({
        where: { id: email.id },
        data: {
          aiVerified: result.found,
          aiScore: result.confidence,
          aiSearchResult: JSON.stringify(result),
          status: result.found && result.confidence >= 0.7 ? "valid" : email.status,
        },
      });

      results.push({ ...updated, aiResult: result });
    }

    return Response.json({
      success: true,
      verified: results.length,
      results: results.map((r) => ({
        id: r.id,
        address: r.address,
        aiVerified: r.aiVerified,
        aiScore: r.aiScore,
        status: r.status,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error: `AI validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
