import { prisma } from "./prisma";

export interface AISearchResult {
  found: boolean;
  confidence: number;
  summary: string;
  sources: string[];
}

interface AIProvider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  model: string;
  baseUrl: string | null;
  isActive: boolean;
}

async function callOpenAI(
  provider: AIProvider,
  prompt: string
): Promise<string> {
  const url = provider.baseUrl || "https://api.openai.com/v1";
  const response = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        {
          role: "system",
          content:
            "You are an email verification assistant. Your job is to verify if a given email address belongs to a real person at a government, GLC, university, or private company. Search for evidence that this person exists at the organization. Respond with JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGoogle(
  provider: AIProvider,
  prompt: string
): Promise<string> {
  const url =
    provider.baseUrl ||
    `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent`;
  const response = await fetch(`${url}?key=${provider.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAnthropic(
  provider: AIProvider,
  prompt: string
): Promise<string> {
  const url = provider.baseUrl || "https://api.anthropic.com/v1";
  const response = await fetch(`${url}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function callCustom(
  provider: AIProvider,
  prompt: string
): Promise<string> {
  if (!provider.baseUrl) throw new Error("Custom provider requires a base URL");
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        {
          role: "system",
          content:
            "You are an email verification assistant. Respond with JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function aiVerifyEmail(
  email: string,
  providerId?: string
): Promise<AISearchResult> {
  let provider: AIProvider | null;

  if (providerId) {
    provider = await prisma.aIProvider.findUnique({ where: { id: providerId } });
  } else {
    provider = await prisma.aIProvider.findFirst({ where: { isActive: true } });
  }

  if (!provider) {
    return {
      found: false,
      confidence: 0,
      summary: "No AI provider configured",
      sources: [],
    };
  }

  const [localPart, domain] = email.split("@");
  const name = localPart.replace(/[._-]/g, " ");
  const domainParts = domain.split(".");
  const orgCode = domainParts[0];

  const prompt = `Verify if this email address belongs to a real person at a real organization.

Email: ${email}
Person name (derived): ${name}
Organization code: ${orgCode}
Domain: ${domain}

Search for "${name} ${orgCode}" and determine:
1. Does this person likely exist at this organization?
2. Is there evidence of this email being used publicly (on official websites, directories, publications)?
3. For government emails (.gov.my), check if the person appears on the ministry/agency website.

Respond in this exact JSON format:
{
  "found": true/false,
  "confidence": 0.0-1.0,
  "summary": "Brief explanation of findings",
  "sources": ["list of URLs or references where this person/email was found"]
}`;

  try {
    let response: string;
    switch (provider.type) {
      case "openai":
        response = await callOpenAI(provider, prompt);
        break;
      case "google":
        response = await callGoogle(provider, prompt);
        break;
      case "anthropic":
        response = await callAnthropic(provider, prompt);
        break;
      case "custom":
        response = await callCustom(provider, prompt);
        break;
      default:
        response = await callOpenAI(provider, prompt);
    }

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        found: parsed.found ?? false,
        confidence: parsed.confidence ?? 0,
        summary: parsed.summary ?? "No summary available",
        sources: parsed.sources ?? [],
      };
    }

    return {
      found: false,
      confidence: 0,
      summary: "Could not parse AI response",
      sources: [],
    };
  } catch (error) {
    return {
      found: false,
      confidence: 0,
      summary: `AI verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      sources: [],
    };
  }
}

export async function aiScrapeEmails(
  targetOrg: string,
  targetUrl?: string,
  providerId?: string
): Promise<{ emails: string[]; details: Record<string, string> }> {
  let provider: AIProvider | null;

  if (providerId) {
    provider = await prisma.aIProvider.findUnique({ where: { id: providerId } });
  } else {
    provider = await prisma.aIProvider.findFirst({ where: { isActive: true } });
  }

  if (!provider) {
    return { emails: [], details: {} };
  }

  const prompt = `You are an email discovery assistant. Find email addresses for people at the following organization.

Target Organization: ${targetOrg}
${targetUrl ? `Website: ${targetUrl}` : ""}

Tasks:
1. Search for the official website of "${targetOrg}"
2. Look for contact directories, staff listings, department pages
3. Find all publicly available email addresses
4. For each email found, provide the person's name and role if available

Focus on:
- Official government directories
- Staff/contact pages on official websites
- Public documents and publications
- Press releases and news articles

Respond in this exact JSON format:
{
  "emails": ["email1@domain.com", "email2@domain.com"],
  "details": {
    "email1@domain.com": "Name - Role/Department",
    "email2@domain.com": "Name - Role/Department"
  },
  "sources": ["list of URLs where emails were found"]
}`;

  try {
    let response: string;
    switch (provider.type) {
      case "openai":
        response = await callOpenAI(provider, prompt);
        break;
      case "google":
        response = await callGoogle(provider, prompt);
        break;
      case "anthropic":
        response = await callAnthropic(provider, prompt);
        break;
      case "custom":
        response = await callCustom(provider, prompt);
        break;
      default:
        response = await callOpenAI(provider, prompt);
    }

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        emails: parsed.emails ?? [],
        details: parsed.details ?? {},
      };
    }

    return { emails: [], details: {} };
  } catch {
    return { emails: [], details: {} };
  }
}
