import { prisma } from "@/lib/prisma";
import { validateSyntax, extractEmailParts } from "@/lib/email-validator";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const emailsRaw = formData.get("emails") as string | null;
    const batchName = (formData.get("batchName") as string) || "Untitled Import";

    let emailList: string[] = [];

    if (file) {
      const text = await file.text();
      const lines = text.split(/[\r\n]+/).filter(Boolean);

      if (lines.length > 0) {
        const header = lines[0].toLowerCase();
        const emailColIndex = header.split(",").findIndex(
          (col) =>
            col.trim().replace(/"/g, "") === "email" ||
            col.trim().replace(/"/g, "") === "email_address" ||
            col.trim().replace(/"/g, "") === "e-mail"
        );

        if (emailColIndex >= 0) {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            const email = cols[emailColIndex]?.trim().replace(/"/g, "");
            if (email) emailList.push(email);
          }
        } else {
          for (const line of lines) {
            const cleaned = line.trim().replace(/"/g, "").split(",")[0].trim();
            if (cleaned.includes("@")) emailList.push(cleaned);
          }
        }
      }
    } else if (emailsRaw) {
      emailList = emailsRaw
        .split(/[\r\n,;]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));
    }

    if (emailList.length === 0) {
      return Response.json(
        { error: "No valid emails found in the input" },
        { status: 400 }
      );
    }

    emailList = [...new Set(emailList.map((e) => e.toLowerCase().trim()))];

    const batch = await prisma.importBatch.create({
      data: {
        name: batchName,
        fileName: file?.name || null,
        totalCount: emailList.length,
        pendingCount: emailList.length,
        status: "processing",
        userId: user?.id || null,
      },
    });

    const emailRecords = emailList.map((email) => {
      const syntaxValid = validateSyntax(email);
      const parts = syntaxValid ? extractEmailParts(email) : null;

      return {
        address: email,
        name: parts?.name || null,
        organization: parts?.orgCode || null,
        domain: parts?.domain || null,
        syntaxValid,
        status: syntaxValid ? "pending" : "invalid",
        source: "import" as const,
        batchId: batch.id,
        userId: user?.id || null,
      };
    });

    let created = 0;
    let skipped = 0;
    for (const record of emailRecords) {
      try {
        await prisma.email.create({ data: record });
        created++;
      } catch {
        skipped++;
      }
    }

    const invalidCount = emailRecords.filter((e) => !e.syntaxValid).length;

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        totalCount: created,
        invalidCount,
        pendingCount: created - invalidCount,
        status: "completed",
      },
    });

    return Response.json({
      success: true,
      batchId: batch.id,
      imported: created,
      skipped,
      invalid: invalidCount,
      total: emailList.length,
    });
  } catch (error) {
    return Response.json(
      {
        error: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
