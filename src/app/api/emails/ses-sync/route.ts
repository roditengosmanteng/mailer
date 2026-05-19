import { SESv2Client, ListSuppressedDestinationsCommand, SuppressionListReason } from "@aws-sdk/client-sesv2";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/emails/ses-sync
 *
 * Manually syncs the AWS SES Account-Level Suppression List
 * with the local email database.
 *
 * Required ENV vars:
 *   AWS_REGION              (e.g. ap-southeast-1)
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 */

interface SyncResult {
  total: number;
  bounced: number;
  complained: number;
  updatedInDb: number;
  emails: {
    address: string;
    reason: string;
    suppressedAt: Date | undefined;
  }[];
}

function createSESClient() {
  return new SESv2Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Optional: protect this endpoint with an admin key
    const authHeader = request.headers.get("x-admin-key");
    const adminKey = process.env.ADMIN_SYNC_KEY;

    if (adminKey && authHeader !== adminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = createSESClient();

    const suppressedEmails: {
      address: string;
      reason: string;
      suppressedAt: Date | undefined;
    }[] = [];

    // Paginate through all suppressed destinations
    let nextToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const cmd = new ListSuppressedDestinationsCommand({
        Reasons: [SuppressionListReason.BOUNCE, SuppressionListReason.COMPLAINT],
        MaxItems: 100,
        NextToken: nextToken,
      });

      const response = await client.send(cmd);

      if (response.SuppressedDestinationSummaries) {
        for (const item of response.SuppressedDestinationSummaries) {
          if (item.EmailAddress) {
            suppressedEmails.push({
              address: item.EmailAddress.toLowerCase(),
              reason: item.Reason ?? "UNKNOWN",
              suppressedAt: item.LastUpdateTime,
            });
          }
        }
      }

      if (response.NextToken) {
        nextToken = response.NextToken;
      } else {
        hasMore = false;
      }
    }

    if (suppressedEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No suppressed emails found in SES",
        total: 0,
        bounced: 0,
        complained: 0,
        updatedInDb: 0,
        emails: [],
      });
    }

    const bouncedAddresses = suppressedEmails
      .filter((e) => e.reason === SuppressionListReason.BOUNCE)
      .map((e) => e.address);

    const complainedAddresses = suppressedEmails
      .filter((e) => e.reason === SuppressionListReason.COMPLAINT)
      .map((e) => e.address);

    let updatedCount = 0;

    if (bouncedAddresses.length > 0) {
      const result = await prisma.email.updateMany({
        where: { address: { in: bouncedAddresses }, deletedAt: null },
        data: { status: "bounced" },
      });
      updatedCount += result.count;
    }

    if (complainedAddresses.length > 0) {
      const result = await prisma.email.updateMany({
        where: { address: { in: complainedAddresses }, deletedAt: null },
        data: { status: "complained" },
      });
      updatedCount += result.count;
    }

    const syncResult: SyncResult = {
      total: suppressedEmails.length,
      bounced: bouncedAddresses.length,
      complained: complainedAddresses.length,
      updatedInDb: updatedCount,
      emails: suppressedEmails,
    };

    console.log(`[SES Sync] Completed: ${syncResult.total} suppressed, ${syncResult.updatedInDb} updated in DB`);

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResult.total} suppressed emails, updated ${syncResult.updatedInDb} records in database`,
      ...syncResult,
    });

  } catch (error) {
    console.error("[SES Sync] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync SES suppression list", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = createSESClient();

    const cmd = new ListSuppressedDestinationsCommand({
      Reasons: [SuppressionListReason.BOUNCE, SuppressionListReason.COMPLAINT],
      MaxItems: 10,
    });

    const response = await client.send(cmd);
    const count = response.SuppressedDestinationSummaries?.length ?? 0;

    return NextResponse.json({
      status: "ok",
      endpoint: "/api/emails/ses-sync",
      description: "AWS SES suppression list manual sync endpoint",
      previewCount: count,
      note: "Call POST to sync suppressed emails to local database",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to SES", details: String(error) },
      { status: 500 }
    );
  }
}
