import { prisma } from "@/lib/prisma";
import { validateMX, validateSMTP } from "@/lib/email-validator";

export async function POST(request: Request) {
  try {
    const { emailIds, batchId } = await request.json();

    let emails;
    if (emailIds && Array.isArray(emailIds)) {
      emails = await prisma.email.findMany({
        where: { id: { in: emailIds }, syntaxValid: true },
      });
    } else if (batchId) {
      emails = await prisma.email.findMany({
        where: { batchId, syntaxValid: true, status: "pending" },
      });
    } else {
      emails = await prisma.email.findMany({
        where: { syntaxValid: true, status: "pending" },
        take: 100,
      });
    }

    if (emails.length === 0) {
      return Response.json({
        success: true,
        validated: 0,
        message: "No pending emails to validate",
      });
    }

    const results = [];
    const CHUNK_SIZE = 10;

    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      const chunk = emails.slice(i, i + CHUNK_SIZE);
      
      // Update statuses to validating
      await prisma.email.updateMany({
        where: { id: { in: chunk.map(e => e.id) } },
        data: { status: "validating" },
      });

      // Process chunk concurrently
      const chunkResults = await Promise.all(
        chunk.map(async (email) => {
          const domain = email.domain || email.address.split("@")[1];
          const mxValid = await validateMX(domain);
          let smtpValid: boolean | null = null;

          if (mxValid) {
            smtpValid = await validateSMTP(email.address, domain);
          }

          // MX validity is the primary signal. SMTP (port 25 RCPT TO) is unreliable —
          // many government/corporate mail servers block probe connections as anti-spam,
          // causing false negatives for valid emails. SMTP result is stored in smtpValid
          // field for reference but doesn't downgrade the status.
          const status = mxValid ? "valid" : "invalid";

          return prisma.email.update({
            where: { id: email.id },
            data: { mxValid, smtpValid, status },
          });
        })
      );

      results.push(...chunkResults);
    }

    if (batchId) {
      const counts = await prisma.email.groupBy({
        by: ["status"],
        where: { batchId },
        _count: true,
      });

      const validCount =
        counts.find((c) => c.status === "valid")?._count || 0;
      const invalidCount =
        counts.find((c) => c.status === "invalid")?._count || 0;
      const pendingCount =
        counts.find((c) => c.status === "pending")?._count || 0;

      await prisma.importBatch.update({
        where: { id: batchId },
        data: { validCount, invalidCount, pendingCount },
      });
    }

    return Response.json({
      success: true,
      validated: results.length,
      results: results.map((r) => ({
        id: r.id,
        address: r.address,
        mxValid: r.mxValid,
        smtpValid: r.smtpValid,
        status: r.status,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
