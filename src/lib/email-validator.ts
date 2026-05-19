import dns from "dns";
import { promisify } from "util";
import net from "net";

const resolveMx = promisify(dns.resolveMx);

export interface SMTPValidationResult {
  smtpValid: boolean;
  isCatchAll: boolean;
  code?: number;
  message?: string;
}

export interface ValidationResult {
  syntaxValid: boolean;
  mxValid: boolean | null;
  smtpValid: boolean | null;
  isCatchAll: boolean | null;
  name: string | null;
  organization: string | null;
  domain: string | null;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function extractEmailParts(email: string): {
  localPart: string;
  domain: string;
  name: string;
  orgCode: string;
  tld: string;
} {
  const [localPart, fullDomain] = email.split("@");
  const domainParts = fullDomain.split(".");
  const orgCode = domainParts[0] || "";
  const tld = domainParts.slice(1).join(".");
  const name = localPart.replace(/[._-]/g, " ").trim();

  return { localPart, domain: fullDomain, name, orgCode, tld };
}

export function validateSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export async function validateMX(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function validateSMTP(
  email: string,
  domain: string
): Promise<SMTPValidationResult> {
  const senderDomain = process.env.SENDER_DOMAIN || "mailer.local";
  const senderEmail = process.env.SENDER_EMAIL || "check@mailer.local";

  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { smtpValid: false, isCatchAll: false, message: "No MX records found" };
    }

    // Sort MX by priority (lowest priority value is the primary server)
    const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);

    // Try each MX record in order of priority (Failover Routing)
    for (const record of sortedMx) {
      const mxHost = record.exchange;
      
      const result = await new Promise<SMTPValidationResult | null>((resolve) => {
        const socket = new net.Socket();
        let step = 0;
        let isCatchAll = false;
        let smtpValid = false;
        
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(null); // Return null on timeout to try the next MX record
        }, 6000);

        socket.connect(25, mxHost, () => {
          // Connected to SMTP server
        });

        socket.on("data", (data) => {
          const response = data.toString();

          if (step === 0 && response.startsWith("220")) {
            socket.write(`EHLO ${senderDomain}\r\n`);
            step++;
          } else if (step === 1 && response.includes("250")) {
            socket.write(`MAIL FROM:<${senderEmail}>\r\n`);
            step++;
          } else if (step === 2 && response.startsWith("250")) {
            // TIER 3 CATCH-ALL CHECK: Check a random mailbox that should never exist
            const randomBox = `antigravity_test_catchall_${Math.floor(Math.random() * 100000)}`;
            socket.write(`RCPT TO:<${randomBox}@${domain}>\r\n`);
            step++;
          } else if (step === 3) {
            // Read catch-all response (250 = Catch-All Active, any other/550 = No Catch-All)
            isCatchAll = response.startsWith("250");
            
            // Now test the actual recipient email address in the same SMTP session
            socket.write(`RCPT TO:<${email}>\r\n`);
            step++;
          } else if (step === 4) {
            // Read target email response (250 = Active Mailbox)
            smtpValid = response.startsWith("250");
            
            socket.write(`QUIT\r\n`);
            step++;
          } else if (step === 5) {
            clearTimeout(timeout);
            resolve({ smtpValid, isCatchAll, message: "Verification complete" });
            socket.destroy();
          }
        });

        socket.on("error", () => {
          clearTimeout(timeout);
          resolve(null); // Try next MX server on connection error
        });
      });

      if (result) {
        return result; // Successful verification, return result
      }
    }

    return { smtpValid: false, isCatchAll: false, message: "All MX servers failed to connect" };
  } catch (err) {
    return {
      smtpValid: false,
      isCatchAll: false,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const trimmed = email.trim().toLowerCase();
  const syntaxValid = validateSyntax(trimmed);

  if (!syntaxValid) {
    return {
      syntaxValid: false,
      mxValid: null,
      smtpValid: null,
      isCatchAll: null,
      name: null,
      organization: null,
      domain: null,
    };
  }

  const { name, orgCode, domain } = extractEmailParts(trimmed);
  const mxValid = await validateMX(domain);
  let smtpValid: boolean | null = null;
  let isCatchAll: boolean | null = null;

  if (mxValid) {
    const smtpResult = await validateSMTP(trimmed, domain);
    smtpValid = smtpResult.smtpValid;
    isCatchAll = smtpResult.isCatchAll;
  }

  return {
    syntaxValid,
    mxValid,
    smtpValid,
    isCatchAll,
    name,
    organization: orgCode,
    domain,
  };
}

