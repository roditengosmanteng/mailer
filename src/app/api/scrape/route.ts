import { prisma } from "@/lib/prisma";
import { aiScrapeEmails } from "@/lib/ai-service";
import { validateSyntax, extractEmailParts } from "@/lib/email-validator";

export async function POST(request: Request) {
  try {
    const { targetOrg, targetUrl, providerId, batchName } =
      await request.json();

    if (!targetOrg) {
      return Response.json(
        { error: "Target organization is required" },
        { status: 400 }
      );
    }

    const job = await prisma.scrapeJob.create({
      data: {
        targetOrg,
        targetUrl: targetUrl || null,
        aiProviderId: providerId || null,
        status: "running",
      },
    });

    const result = await aiScrapeEmails(targetOrg, targetUrl, providerId);

    if (result.emails.length === 0) {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          emailsFound: 0,
          results: JSON.stringify(result),
        },
      });

      return Response.json({
        success: true,
        jobId: job.id,
        emailsFound: 0,
        message: "No emails found",
      });
    }

    const batch = await prisma.importBatch.create({
      data: {
        name: batchName || `Scrape: ${targetOrg}`,
        totalCount: result.emails.length,
        pendingCount: result.emails.length,
        status: "completed",
      },
    });

    let created = 0;
    for (const email of result.emails) {
      const trimmed = email.trim().toLowerCase();
      if (!validateSyntax(trimmed)) continue;

      const parts = extractEmailParts(trimmed);
      try {
        await prisma.email.create({
          data: {
            address: trimmed,
            name: result.details[email] || parts.name,
            organization: parts.orgCode,
            domain: parts.domain,
            syntaxValid: true,
            status: "pending",
            source: "scrape",
            batchId: batch.id,
          },
        });
        created++;
      } catch {
        // duplicate
      }
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { totalCount: created, pendingCount: created },
    });

    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        emailsFound: created,
        results: JSON.stringify(result),
      },
    });

    return Response.json({
      success: true,
      jobId: job.id,
      batchId: batch.id,
      emailsFound: created,
      emails: result.emails,
      details: result.details,
    });
  } catch (error) {
    return Response.json(
      {
        error: `Scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const jobs = await prisma.scrapeJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({ jobs });
}
