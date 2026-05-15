import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const batchId = searchParams.get("batchId");
  const status = searchParams.get("status") || "valid";
  const minScore = parseFloat(searchParams.get("minScore") || "0");

  const where: Record<string, unknown> = {};
  if (batchId) where.batchId = batchId;
  if (status !== "all") where.status = status;
  if (minScore > 0) where.aiScore = { gte: minScore };

  const emails = await prisma.email.findMany({
    where,
    orderBy: [{ aiScore: "desc" }, { createdAt: "desc" }],
  });

  const csvHeader =
    "email,name,organization,domain,syntax_valid,mx_valid,smtp_valid,ai_verified,ai_score,status,source";
  const csvRows = emails.map((e) =>
    [
      e.address,
      `"${(e.name || "").replace(/"/g, '""')}"`,
      `"${(e.organization || "").replace(/"/g, '""')}"`,
      e.domain || "",
      e.syntaxValid,
      e.mxValid ?? "",
      e.smtpValid ?? "",
      e.aiVerified ?? "",
      e.aiScore ?? "",
      e.status,
      e.source,
    ].join(",")
  );

  const csv = [csvHeader, ...csvRows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="verified-emails-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
