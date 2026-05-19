import { SESv2Client, ListSuppressedDestinationsCommand, SuppressionListReason } from "@aws-sdk/client-sesv2";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/emails/ses-sync
 *
 * Manually syncs the AWS SES Account-Level Suppression List
 * with the local email database.
 *
 * This is useful for:
 * - One-time cleanup after a bounce/complaint incident
 * - Periodic reconciliation to catch any missed webhook events
 *
 * Call this endpoint from an admin panel or a cron job.
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

export async function POST(request: NextRequest) {
  try {
    // Optional: check for admin auth header to protect this endpoint
    // You can add your own auth logic here e.g. check session or API key
    const authHeader = request.headers.get("x-admin-key");
    const adminKey = process.env.ADMIN_SYNC_KEY;

    if (adminKey && authHeader !== adminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const region = process.env.AWS_REGION || "ap-southeast-1";

    const client = new SESv2Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const suppressedEmails: {
      address: string;
      reason: string;
      suppressedAt: Date | undefined;
    }[] = [];

    // Paginate through all suppressed destinations
    let nextToken: string | undefined = undefined;

    do {
      const command = new ListSuppressedDestinationsCommand({
        Reasons: [SuppressionListReason.BOUNCE, SuppressionListReason.COMPLAINT],
        MaxItems: 100,
        NextToken: nextToken,
      });

      const response = await client.send(command);

      if (response.SuppressedDestinationSummaries) {
        for (const item of response.SuppressedDestinationSummaries) {
          if (item.EmailAddress) {
            suppressedEmails.push({
              address: item.EmailAddress.toLowerCase(),
              reason: item.Reason || "UNKNOWN",
              suppressedAt: item.LastUpdateTime,
            });
          }
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

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

    // Split by reason
    const bouncedAddresses = suppressedEmails
      .filter((e) => e.reason === SuppressionListReason.BOUNCE)
      .map((e) => e.address);

    const complainedAddresses = suppressedEmails
      .filter((e) => e.reason === SuppressionListReason.COMPLAINT)
      .map((e) => e.address);

    let updatedCount = 0;

    // Update bounced emails
    if (bouncedAddresses.length > 0) {
      const result = await prisma.email.updateMany({
        where: {
          address: { in: bouncedAddresses },
          deletedAt: null,
        },
        data: {
          status: "bounced",
        },
      });
      updatedCount += result.count;
    }

    // Update complained emails
    if (complainedAddresses.length > 0) {
      const result = await prisma.email.updateMany({
        where: {
          address: { in: complainedAddresses },
          deletedAt: null,
        },
        data: {
          status: "complained",
        },
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

// GET - returns current suppression list count without updating DB
export async function GET() {
  try {
    const region = process.env.AWS_REGION || "ap-southeast-1";

    const client = new SESv2Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new ListSuppressedDestinationsCommand({
      Reasons: [SuppressionListReason.BOUNCE, SuppressionListReason.COMPLAINT],
      MaxItems: 10,
    });

    const response = await client.send(command);
    const count = response.SuppressedDestinationSummaries?.length || 0;

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
