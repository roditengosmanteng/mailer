import dns from "dns";
import { promisify } from "util";
import net from "net";

const resolveMx = promisify(dns.resolveMx);

export interface ValidationResult {
  syntaxValid: boolean;
  mxValid: boolean | null;
  smtpValid: boolean | null;
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
): Promise<boolean> {
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) return false;

    const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
    const mxHost = sortedMx[0].exchange;

    return await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      let step = 0;
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 10000);

      socket.connect(25, mxHost, () => {
        // connected
      });

      socket.on("data", (data) => {
        const response = data.toString();
        if (step === 0 && response.startsWith("220")) {
          socket.write(`EHLO mailer.local\r\n`);
          step++;
        } else if (step === 1 && response.includes("250")) {
          socket.write(`MAIL FROM:<check@mailer.local>\r\n`);
          step++;
        } else if (step === 2 && response.startsWith("250")) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step++;
        } else if (step === 3) {
          socket.write(`QUIT\r\n`);
          clearTimeout(timeout);
          resolve(response.startsWith("250"));
          socket.destroy();
        }
      });

      socket.on("error", () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  } catch {
    return false;
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
      name: null,
      organization: null,
      domain: null,
    };
  }

  const { name, orgCode, domain } = extractEmailParts(trimmed);
  const mxValid = await validateMX(domain);
  let smtpValid: boolean | null = null;

  if (mxValid) {
    smtpValid = await validateSMTP(trimmed, domain);
  }

  return {
    syntaxValid,
    mxValid,
    smtpValid,
    name,
    organization: orgCode,
    domain,
  };
}
