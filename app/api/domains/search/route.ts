import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getDomainProvider, getDomainRegistrars } from "@/lib/domains/provider";

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
        const tld = "." + domain.split(".").pop()!;
        const pricing = (tlds ?? []).find((item) => item.tld === tld);
        const base = {
          domain,
          available: false,
          price: pricing?.retail_price ? Number(pricing.retail_price) : 0,
          currency: pricing?.currency ?? "XOF",
          tld,
          subdomain:
            domain.split(".")[0] +
            "." +
            (process.env.BICKRI_HOSTING_DOMAIN || "bickridomains.com"),
        };

        try {
          const providerResult = await provider.checkAvailability(domain);
          return {
            ...base,
            ...providerResult,
            price: base.price || providerResult.price,
            currency: base.currency || providerResult.currency,
          };
        } catch (providerError) {
          console.error("Domain provider lookup failed:", providerError);
          return base;
        }
      })
    );

    return NextResponse.json({
      query,
      results,
      extensions: (tlds ?? []).map((item) => ({
        tld: item.tld,
        price: Number(item.retail_price),
        currency: item.currency,
      })),
      registrars: getDomainRegistrars(),
    });
  } catch (error) {
    console.error("Domain search failed:", error);
    return NextResponse.json(
      { error: "La recherche des domaines est temporairement indisponible." },
      { status: 502 }
    );
  }
}
