import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getDomainProvider } from "@/lib/domains/provider";

const isDomain = (value: string) => /^[a-z0-9-]+\.[a-z0-9.-]+$/.test(value);

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("domain")?.trim().toLowerCase();

  if (!query || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(query)) {
    return NextResponse.json({ error: "Nom de domaine invalide." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tlds, error } = await supabase
    .from("domain_tlds")
    .select("tld, retail_price, currency, enabled")
    .eq("enabled", true)
    .order("retail_price", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Impossible de charger les extensions." }, { status: 500 });
  }

  const domains = isDomain(query)
    ? [query]
    : (tlds ?? []).map((item) => query + item.tld);

  try {
    const provider = getDomainProvider();

    const results = await Promise.all(
      domains.map(async (domain) => {
        const providerResult = await provider.checkAvailability(domain);
        const tld = "." + domain.split(".").pop()!;
        const pricing = (tlds ?? []).find((item) => item.tld === tld);

        return {
          ...providerResult,
          price: pricing?.retail_price ? Number(pricing.retail_price) : providerResult.price,
          currency: pricing?.currency ?? providerResult.currency,
          subdomain:
            domain.split(".")[0] +
            "." +
            (process.env.BICKRI_HOSTING_DOMAIN || "bickridomains.com"),
        };
      })
    );

    return NextResponse.json({ query, results });
  } catch (error) {
    console.error("OpenSRS domain search failed:", error);
    return NextResponse.json(
      { error: "Le service de registre de domaines est temporairement indisponible." },
      { status: 502 }
    );
  }
}
