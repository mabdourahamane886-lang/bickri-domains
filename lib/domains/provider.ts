import { createHash } from "crypto";

export type Availability = {
  domain: string;
  available: boolean;
  price: number;
  currency: string;
  tld: string;
};

export interface DomainProvider {
  checkAvailability(domain: string): Promise<Availability>;
}

export type DomainRegistrar = {
  id: string;
  name: string;
  mode: "live" | "test" | "not_configured";
  capabilities: string[];
};

export function getDomainRegistrars(): DomainRegistrar[] {
  const opensrsConfigured = Boolean(process.env.OPENSRS_USERNAME && process.env.OPENSRS_API_KEY);
  const opensrsTestMode = process.env.OPENSRS_TEST_MODE !== "false";

  return [
    {
      id: "opensrs",
      name: "OpenSRS / Tucows",
      mode: opensrsConfigured ? (opensrsTestMode ? "test" : "live") : "not_configured",
      capabilities: ["Disponibilité", "Enregistrement", "Renouvellement", "Transfert"],
    },
  ];
}

export class MockDomainProvider implements DomainProvider {
  async checkAvailability(domain: string) {
    const tld = "." + domain.split(".").pop()!;
    const prices: Record<string, number> = {
      ".com": 12000,
      ".net": 14000,
      ".org": 14000,
      ".info": 15000,
      ".biz": 15000,
    };
    const normalized = domain.toLowerCase();

    return {
      domain: normalized,
      available: !["google.com", "facebook.com", "openai.com"].includes(normalized),
      price: prices[tld] ?? 18000,
      currency: "XOF",
      tld,
    };
  }
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function item(key: string, value: string) {
  return `<item key="${escapeXml(key)}">${escapeXml(value)}</item>`;
}

function buildLookupXml(domain: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        ${item("protocol", "XCP")}
        ${item("action", "LOOKUP")}
        ${item("object", "DOMAIN")}
        <item key="attributes">
          <dt_assoc>
            ${item("domain", domain)}
            ${item("no_cache", "1")}
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

function opensrsSignature(xml: string, apiKey: string) {
  const first = createHash("md5").update(xml + apiKey).digest("hex");
  return createHash("md5").update(first + apiKey).digest("hex");
}

function extractXmlValue(xml: string, key: string) {
  const pattern = new RegExp(
    `<item\\s+key=["']${key}["']\\s*>\\s*([^<]*)\\s*</item>`,
    "i"
  );
  return xml.match(pattern)?.[1]?.trim() ?? null;
}

export class OpenSrsDomainProvider implements DomainProvider {
  private readonly username = process.env.OPENSRS_USERNAME;
  private readonly apiKey = process.env.OPENSRS_API_KEY;
  private readonly testMode = process.env.OPENSRS_TEST_MODE !== "false";

  private get endpoint() {
    return this.testMode
      ? "https://horizon.opensrs.net:55443"
      : "https://rr-n1-tor.opensrs.net:55443";
  }

  async checkAvailability(domain: string): Promise<Availability> {
    if (!this.username || !this.apiKey) {
      throw new Error("OpenSRS credentials are not configured.");
    }

    const normalized = domain.trim().toLowerCase();
    const tld = "." + normalized.split(".").pop()!;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-Username": this.username,
        "X-Signature": opensrsSignature(buildLookupXml(normalized), this.apiKey),
      },
      body: buildLookupXml(normalized),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`OpenSRS HTTP error: ${response.status}`);
    }

    const xml = await response.text();
    const success = extractXmlValue(xml, "is_success");
    const responseCode = extractXmlValue(xml, "response_code");
    const status = extractXmlValue(xml, "status");

    if (success !== "1") {
      const message = extractXmlValue(xml, "response_text") || "OpenSRS lookup failed.";
      throw new Error(message);
    }

    return {
      domain: normalized,
      available: status?.toLowerCase() === "available" || responseCode === "210",
      price: 0,
      currency: "USD",
      tld,
    };
  }
}

export function getDomainProvider(): DomainProvider {
  const provider = (process.env.DOMAIN_PROVIDER || "opensrs").toLowerCase();

  if (provider === "mock") {
    return new MockDomainProvider();
  }

  if (provider === "opensrs") {
    return new OpenSrsDomainProvider();
  }

  throw new Error(`Unsupported domain provider: ${provider}`);
}
