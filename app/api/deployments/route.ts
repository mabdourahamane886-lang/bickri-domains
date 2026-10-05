import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const repoPattern = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/;

export async function GET(req: Request) {
  const s = await createServerSupabaseClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const siteId = new URL(req.url).searchParams.get("site_id");
  let q = s.from("domain_deployments").select("id,site_id,repository_url,branch,commit_sha,framework,build_command,output_directory,status,deployment_url,error_message,logs,created_at,started_at,finished_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  if (siteId) q = q.eq("site_id", siteId);
  const { data, error } = await q;
  return NextResponse.json({ deployments: data || [], error: error?.message });
}

export async function POST(req: Request) {
  const s = await createServerSupabaseClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const b = await req.json();
  const siteId = String(b.site_id || "");
  const repositoryUrl = String(b.repository_url || "").trim().replace(/\/$/, "");
  const branch = String(b.branch || "main").trim() || "main";
  if (!siteId || !repoPattern.test(repositoryUrl)) return NextResponse.json({ error: "Site et dépôt GitHub valides requis." }, { status: 400 });
  const { data: site } = await s.from("domain_sites").select("id,slug,host").eq("id", siteId).eq("user_id", user.id).single();
  if (!site) return NextResponse.json({ error: "Site introuvable." }, { status: 404 });
  const { data: deployment, error } = await s.from("domain_deployments").insert({
    site_id: site.id, user_id: user.id, repository_url: repositoryUrl, branch,
    framework: String(b.framework || "nextjs").slice(0, 80),
    build_command: String(b.build_command || "npm run build").slice(0, 200),
    output_directory: String(b.output_directory || "").slice(0, 200), status: "queued"
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Impossible de créer le déploiement." }, { status: 500 });

  const webhookUrl = process.env.BICKRI_DEPLOY_WEBHOOK_URL;
  const webhookSecret = process.env.BICKRI_DEPLOY_WEBHOOK_SECRET;
  if (webhookUrl && webhookSecret) {
    try {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Bickri-Deploy-Secret": webhookSecret },
        body: JSON.stringify({ deployment_id: deployment.id, site_id: site.id, host: site.host, repository_url: repositoryUrl, branch })
      });
      if (!r.ok) throw new Error(`Runner HTTP ${r.status}`);
      await s.from("domain_deployments").update({ status: "building", started_at: new Date().toISOString() }).eq("id", deployment.id).eq("user_id", user.id);
    } catch (e) {
      await s.from("domain_deployments").update({ status: "failed", error_message: e instanceof Error ? e.message : "Runner indisponible." }).eq("id", deployment.id).eq("user_id", user.id);
      return NextResponse.json({ error: "Déploiement enregistré mais le runner est indisponible.", deployment }, { status: 202 });
    }
  }
  return NextResponse.json({ deployment }, { status: 201 });
}
