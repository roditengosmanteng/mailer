import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// SNS Message Types
type SNSMessageType = "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";

interface SNSMessage {
  Type: SNSMessageType;
  MessageId: string;
  TopicArn: string;
  Message: string;
  SubscribeURL?: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
}

interface SESBounceRecipient {
  emailAddress: string;
  action?: string;
  status?: string;
  diagnosticCode?: string;
}

interface SESComplaintRecipient {
  emailAddress: string;
}

interface SESNotification {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: SESBounceRecipient[];
    timestamp: string;
  };
  complaint?: {
    complainedRecipients: SESComplaintRecipient[];
    timestamp: string;
    complaintFeedbackType?: string;
  };
  mail?: {
    messageId: string;
    source: string;
    destination: string[];
    timestamp: string;
  };
}

/**
 * Verify that the request is genuinely from AWS SNS.
 * SNS sends a special header: x-amz-sns-message-type
 */
function isSNSRequest(request: NextRequest): boolean {
  const messageType = request.headers.get("x-amz-sns-message-type");
  return !!messageType;
}

export async function POST(request: NextRequest) {
  try {
    // Verify request is from SNS
    if (!isSNSRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SNSMessage = await request.json();
    const messageType = request.headers.get("x-amz-sns-message-type") as SNSMessageType;

    // Handle SNS subscription confirmation
    // AWS sends this when you first create the subscription
    if (messageType === "SubscriptionConfirmation" && body.SubscribeURL) {
      console.log("[SES Webhook] Confirming SNS subscription:", body.TopicArn);
      await fetch(body.SubscribeURL);
      return NextResponse.json({ ok: true, message: "Subscription confirmed" });
    }

    // Handle actual SES notifications
    if (messageType === "Notification") {
      let notification: SESNotification;

      try {
        notification = JSON.parse(body.Message) as SESNotification;
      } catch {
        console.error("[SES Webhook] Failed to parse SES notification message");
        return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
      }

      // --- BOUNCE HANDLING ---
      if (notification.notificationType === "Bounce" && notification.bounce) {
        const { bounceType, bounceSubType, bouncedRecipients } = notification.bounce;

        // Only mark as bounced for permanent/hard bounces
        // Transient bounces (e.g. mailbox full) should not be suppressed permanently
        const isHardBounce = bounceType === "Permanent" ||
          (bounceType === "Undetermined" && bounceSubType === "Undetermined");

        const bouncedEmails = bouncedRecipients.map((r) => r.emailAddress.toLowerCase());

        console.log(`[SES Webhook] ${bounceType}/${bounceSubType} bounce for:`, bouncedEmails);

        if (isHardBounce && bouncedEmails.length > 0) {
          // Update all matching emails in DB to status "bounced"
          const updated = await prisma.email.updateMany({
            where: {
              address: { in: bouncedEmails },
              deletedAt: null,
            },
            data: {
              status: "bounced",
            },
          });

          console.log(`[SES Webhook] Marked ${updated.count} emails as bounced`);
        }
      }

      // --- COMPLAINT HANDLING ---
      if (notification.notificationType === "Complaint" && notification.complaint) {
        const { complainedRecipients } = notification.complaint;
        const complaintEmails = complainedRecipients.map((r) => r.emailAddress.toLowerCase());

        console.log("[SES Webhook] Complaint received for:", complaintEmails);

        if (complaintEmails.length > 0) {
          // Mark complained emails as "complained" status
          const updated = await prisma.email.updateMany({
            where: {
              address: { in: complaintEmails },
              deletedAt: null,
            },
            data: {
              status: "complained",
            },
          });

          console.log(`[SES Webhook] Marked ${updated.count} emails as complained`);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Unknown message type
    return NextResponse.json({ ok: true, message: "Unhandled message type" });

  } catch (error) {
    console.error("[SES Webhook] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET handler - simple health check for this webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/ses-webhook",
    description: "AWS SES SNS bounce and complaint webhook handler",
  });
}
