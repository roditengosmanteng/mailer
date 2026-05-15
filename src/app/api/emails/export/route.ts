import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const ALL_COLUMNS = [
  "email",
  "name",
  "organization",
  "domain",
  "syntax_valid",
  "mx_valid",
  "smtp_valid",
  "ai_verified",
  "ai_score",
  "status",
  "source",
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number];

function getColumnValue(
  e: Record<string, unknown>,
  col: ColumnKey,
  delimiter: string
): string {
  const wrapQuotes = (val: string) => {
    if (val.includes(delimiter) || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  switch (col) {
    case "email":
      return wrapQuotes(String(e.address ?? ""));
    case "name":
      return wrapQuotes(String(e.name ?? ""));
    case "organization":
      return wrapQuotes(String(e.organization ?? ""));
    case "domain":
      return String(e.domain ?? "");
    case "syntax_valid":
      return String(e.syntaxValid ?? "");
    case "mx_valid":
      return e.mxValid != null ? String(e.mxValid) : "";
    case "smtp_valid":
      return e.smtpValid != null ? String(e.smtpValid) : "";
    case "ai_verified":
      return e.aiVerified != null ? String(e.aiVerified) : "";
    case "ai_score":
      return e.aiScore != null ? String(e.aiScore) : "";
    case "status":
      return String(e.status ?? "");
    case "source":
      return String(e.source ?? "");
    default:
      return "";
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const batchId = searchParams.get("batchId");
  const status = searchParams.get("status") || "valid";
  const minScore = parseFloat(searchParams.get("minScore") || "0");
  const delimiter = searchParams.get("delimiter") === ";" ? ";" : ",";
  const columnsParam = searchParams.get("columns");

  // Parse selected columns, default to all
  let columns: ColumnKey[];
  if (columnsParam) {
    const requested = columnsParam.split(",") as ColumnKey[];
    columns = requested.filter((c) => ALL_COLUMNS.includes(c));
    if (columns.length === 0) columns = [...ALL_COLUMNS];
  } else {
    columns = [...ALL_COLUMNS];
  }

  const where: Record<string, unknown> = {};
  if (batchId) where.batchId = batchId;
  if (status !== "all") where.status = status;
  if (minScore > 0) where.aiScore = { gte: minScore };

  const emails = await prisma.email.findMany({
    where,
    orderBy: [{ aiScore: "desc" }, { createdAt: "desc" }],
  });

  const csvHeader = columns.join(delimiter);
  const csvRows = emails.map((e) =>
    columns
      .map((col) =>
        getColumnValue(e as unknown as Record<string, unknown>, col, delimiter)
      )
      .join(delimiter)
  );

  const csv = [csvHeader, ...csvRows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="verified-emails-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
