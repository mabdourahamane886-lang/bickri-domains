import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const domainPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export async function GET() {
  const s = await createServerSupabaseClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise.", code: "AUTH_REQUIRED" }, { status: 401 });

  const { data, error } = await s
    .from("domain_cart_items")
    .select("id,user_id,domain,tld,years,price,currency,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Cart GET failed:", error);
    return NextResponse.json({ items: [], error: "Impossible de charger le panier." }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(req: Request) {
  const s = await createServerSupabaseClient();
  const { data: { user } } = await s.auth.getUser();
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

  if (pricingError) {
    console.error("Cart pricing lookup failed:", pricingError);
    return NextResponse.json({ error: "Impossible de vérifier le tarif du domaine." }, { status: 500 });
  }

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

  if (error) {
    console.error("Cart POST failed:", error);
    return NextResponse.json({ error: "Impossible d'ajouter le domaine au panier." }, { status: 400 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const s = await createServerSupabaseClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const domain = new URL(req.url).searchParams.get("domain")?.trim().toLowerCase();
  if (!domain) return NextResponse.json({ error: "Domaine requis." }, { status: 400 });

  const { error } = await s
    .from("domain_cart_items")
    .delete()
    .eq("user_id", user.id)
    .eq("domain", domain);

  if (error) {
    console.error("Cart DELETE failed:", error);
    return NextResponse.json({ error: "Impossible de supprimer le domaine." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
