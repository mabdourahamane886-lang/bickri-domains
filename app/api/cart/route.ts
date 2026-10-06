import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const domainPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

function serverError(message: string, error?: { code?: string; message?: string; details?: string; hint?: string }) {
  console.error(message, error);
  return NextResponse.json(
    { items: [], error: message, code: error?.code || "CART_ERROR" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  try {
    const s = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await s.auth.getUser();

    if (authError) console.error("Cart auth check failed:", authError);
    if (!user) {
      return NextResponse.json(
        { error: "Connexion requise.", code: "AUTH_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, error } = await s
      .from("domain_cart_items")
      .select("id,user_id,domain,tld,years,price,currency,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError("Impossible de charger le panier.", error);

    return NextResponse.json(
      { items: data || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverError("Impossible de charger le panier.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const s = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await s.auth.getUser();

    if (authError) console.error("Cart POST auth check failed:", authError);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const domain = String(body.domain || "").trim().toLowerCase();
    const years = Math.min(10, Math.max(1, Number(body.years || 1)));

    if (!domainPattern.test(domain)) {
      return NextResponse.json({ error: "Domaine invalide." }, { status: 400 });
    }

    const parts = domain.split(".");
    const tld = "." + parts[parts.length - 1];

    const { data: pricing, error: pricingError } = await s
      .from("domain_tlds")
      .select("tld, retail_price, currency, enabled")
      .eq("tld", tld)
      .eq("enabled", true)
      .maybeSingle();

    if (pricingError) return serverError("Impossible de vérifier le tarif du domaine.", pricingError);
    if (!pricing) {
      return NextResponse.json({ error: `L'extension ${tld} n'est pas disponible.` }, { status: 400 });
    }

    const item = {
      user_id: user.id,
      domain,
      tld: pricing.tld,
      years,
      price: Number(pricing.retail_price),
      currency: pricing.currency,
    };

    const { data, error } = await s
      .from("domain_cart_items")
      .upsert(item, { onConflict: "user_id,domain" })
      .select()
      .single();

    if (error) return serverError("Impossible d'ajouter le domaine au panier.", error);

    return NextResponse.json(
      { item: data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverError("Impossible d'ajouter le domaine au panier.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const s = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await s.auth.getUser();

    if (authError) console.error("Cart DELETE auth check failed:", authError);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    const domain = new URL(req.url).searchParams.get("domain")?.trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: "Domaine requis." }, { status: 400 });

    const { error } = await s
      .from("domain_cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("domain", domain);

    if (error) return serverError("Impossible de supprimer le domaine.", error);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverError("Impossible de supprimer le domaine.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
