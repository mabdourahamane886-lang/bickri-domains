"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("domains");
  const [userEmail, setUserEmail] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch("/api/cart", { cache: "no-store" }),
        fetch("/api/domains", { cache: "no-store" }),
        fetch("/api/hosting/sites", { cache: "no-store" }),
        fetch("/api/deployments", { cache: "no-store" }),
      ]);

      if (responses.some((r) => r.status === 401)) {
        router.replace("/login");
        return;
      }

      const [cartData, domainsData, sitesData, deploymentsData] = await Promise.all(
        responses.map(async (response) => {
          const text = await response.text();
          try { return text ? JSON.parse(text) : {}; } catch { return {}; }
        })
      );

      setCart(cartData.items || []);
      setDomains(domainsData.domains || []);
      setSites(sitesData.sites || []);
      setDeployments(deploymentsData.deployments || []);

      const apiError = [cartData, domainsData, sitesData, deploymentsData]
        .map((x) => x?.error)
        .find(Boolean);
      if (apiError) setMsg(apiError);
    } catch {
      setMsg("Impossible de charger votre tableau de bord. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      setUserEmail(data.user.email || "");
      setCheckingAuth(false);
      load();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function remove(domain: string) {
    await fetch("/api/cart?domain=" + encodeURIComponent(domain), { method: "DELETE" });
    load();
  }

  async function checkout() {
    const r = await fetch("/api/checkout", { method: "POST" });
    const x = await r.json();
    setMsg(x.message || x.error || "Commande créée.");
    load();
  }

  async function toggle(id: string, key: string, value: boolean) {
    await fetch("/api/domains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [key]: !value }),
    });
    load();
  }

  async function addSite() {
    const slug = prompt("Choisissez votre sous-domaine");
    if (!slug) return;
    const r = await fetch("/api/hosting/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title: "Mon site Bickri" }),
    });
    const x = await r.json();
    setMsg(x.site ? "Site créé : " + x.site.host : x.error || "Erreur");
    load();
  }

  async function deploy(site: any) {
    const repo = prompt("URL du dépôt GitHub (ex: https://github.com/mabdourahamane886-lang/mon-site)");
    if (!repo) return;
    const branch = prompt("Branche GitHub", "main") || "main";
    const r = await fetch("/api/deployments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: site.id, repository_url: repo, branch }),
    });
    const x = await r.json();
    setMsg(x.deployment ? "Déploiement " + x.deployment.status + " pour " + site.host : x.error || "Erreur");
    load();
  }

  if (checkingAuth) {
    return (
      <main style={{ minHeight: "100vh", background: "#07152f", color: "#fff", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <b style={{ color: "#d4aa45" }}>BICKRI DOMAINS</b>
          <p style={{ color: "#b8c4d9" }}>Vérification de votre session…</p>
        </div>
      </main>
    );
  }

  const tabs = [["domains", "Mes domaines"], ["cart", "Panier"], ["hosting", "Hébergement"], ["transfer", "Transfert"], ["dns", "DNS"], ["billing", "Factures"]];
  const card = { background: "#0d2346", border: "1px solid #203b67", borderRadius: 18, padding: 22 } as any;

  return (
    <main style={{ minHeight: "100vh", background: "#07152f", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 1150, margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <b style={{ color: "#d4aa45" }}>BICKRI DOMAINS</b>
            <h1>Espace client</h1>
            <p style={{ color: "#b8c4d9" }}>Domaines, hébergement, DNS, transferts et déploiements.</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#b8c4d9", fontSize: 14 }}>{userEmail}</span>
            <a href="/logout" style={{ color: "#d4aa45" }}>Déconnexion</a>
            <a href="/" style={{ color: "#fff" }}>← Accueil</a>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 8, overflowX: "auto", padding: "20px 0" }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "11px 16px", borderRadius: 999, border: "1px solid #29466f", background: tab === id ? "#d4aa45" : "#0d2346", color: tab === id ? "#07152f" : "#fff", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </nav>

        {msg && <div style={{ padding: 14, background: "#15365e", borderRadius: 12, marginBottom: 16 }}>{msg}</div>}
        {loading && <div style={{ color: "#b8c4d9", marginBottom: 12 }}>Actualisation…</div>}

        <section style={card}>
          {tab === "domains" && <>
            <h2>Mes domaines</h2>
            {domains.length ? domains.map(d => (
              <div key={d.id} style={{ padding: "16px 0", borderBottom: "1px solid #203b67" }}>
                <strong>{d.domain_name}</strong> <span style={{ color: "#72d6a0" }}>{d.status}</span>
                <div style={{ marginTop: 10 }}>
                  <label>Auto-renouvellement <input type="checkbox" checked={!!d.auto_renew} onChange={() => toggle(d.id, "auto_renew", d.auto_renew)} /></label>{" "}
                  <label>Privacy <input type="checkbox" checked={!!d.privacy_enabled} onChange={() => toggle(d.id, "privacy_enabled", d.privacy_enabled)} /></label>
                </div>
              </div>
            )) : <p>Aucun domaine enregistré.</p>}
          </>}

          {tab === "cart" && <>
            <h2>Panier</h2>
            {cart.length ? cart.map(i => (
              <div key={i.domain} style={{ display: "flex", justifyContent: "space-between", padding: 14, borderBottom: "1px solid #203b67", gap: 12 }}>
                <span>{i.domain} · {i.years} an</span>
                <button onClick={() => remove(i.domain)}>Supprimer</button>
              </div>
            )) : <p>Panier vide.</p>}
            {cart.length > 0 && <button onClick={checkout} style={{ marginTop: 18, padding: "12px 20px", border: 0, borderRadius: 10, background: "#d4aa45" }}>Passer la commande</button>}
          </>}

          {tab === "hosting" && <>
            <h2>Hébergement Bickri</h2>
            <button onClick={addSite} style={{ padding: "12px 18px", border: 0, borderRadius: 10, background: "#d4aa45" }}>+ Créer un site</button>
            {sites.map(s => {
              const latest = deployments.find(d => d.site_id === s.id);
              return (
                <div key={s.id} style={{ padding: 16, borderBottom: "1px solid #203b67", marginTop: 8 }}>
                  <strong>{s.host}</strong>
                  <div style={{ color: "#b8c4d9", margin: "6px 0" }}>{s.status} · {s.title}</div>
                  <button onClick={() => deploy(s)} style={{ padding: "9px 14px", border: 0, borderRadius: 8, background: "#d4aa45" }}>🚀 Déployer depuis GitHub</button>
                  {latest && <div style={{ marginTop: 8, fontSize: 14 }}>
                    Dernier déploiement : <b>{latest.status}</b>
                    {latest.deployment_url && <> · <a href={latest.deployment_url.startsWith("http") ? latest.deployment_url : "https://" + latest.deployment_url} target="_blank" rel="noreferrer" style={{ color: "#d4aa45" }}>ouvrir</a></>}
                    {latest.error_message && <div style={{ color: "#ff9b9b" }}>{latest.error_message}</div>}
                  </div>}
                </div>
              );
            })}
          </>}

          {tab === "transfer" && <><h2>Transfert de domaine</h2><p>Transférez un domaine vers Bickri avec son code d'autorisation.</p><a href="/transfer" style={{ color: "#d4aa45" }}>Démarrer un transfert →</a></>}
          {tab === "dns" && <><h2>Gestion DNS</h2><p>API DNS prête pour A, AAAA, CNAME, MX, TXT, NS et CAA.</p></>}
          {tab === "billing" && <><h2>Facturation</h2><p>Les commandes, paiements et factures sont enregistrés dans Supabase.</p></>}
        </section>
      </div>
    </main>
  );
}
