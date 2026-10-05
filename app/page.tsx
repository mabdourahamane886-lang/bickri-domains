"use client";

import { useState } from "react";

type DomainResult = {
  domain: string;
  available: boolean;
  price: number;
  currency: string;
  tld: string;
  subdomain: string;
};

export default function Home() {
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState<DomainResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    const value = domain.trim();
    if (!value) return;

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/domains/search?domain=" + encodeURIComponent(value));
      const data = await response.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hero">
      <div className="container">
        <nav className="nav">
          <div className="brand">Bickri <span>Domains</span></div>
          <div className="badge">DOMAIN & HOSTING</div>
        </nav>

        <section className="heroContent">
          <div className="eyebrow">Domaine + hébergement Bickri</div>
          <h1 className="title">Votre nom, votre domaine, votre site.</h1>
          <p className="muted">
            Entrez simplement le nom de votre projet. Bickri Domains recherche automatiquement
            les extensions disponibles et prépare aussi votre adresse d’hébergement en sous-domaine.
          </p>

          <div className="search">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="ex. bickri ou bickri.com"
            />
            <button className="button" onClick={search} disabled={loading}>
              {loading ? "Recherche…" : "Rechercher"}
            </button>
          </div>

          {results.length > 0 && (
            <div className="results">
              {results.map((item) => (
                <article className="domainCard" key={item.domain}>
                  <div>
                    <div className="domainName">{item.domain}</div>
                    <div className={item.available ? "available" : "unavailable"}>
                      {item.available ? "✓ Disponible" : "✕ Indisponible"}
                    </div>
                  </div>

                  <div className="domainRight">
                    {item.available && (
                      <div className="price">
                        {new Intl.NumberFormat("fr-FR").format(item.price)} {item.currency}
                        <small>/ an</small>
                      </div>
                    )}
                    <div className="hosting">
                      <span>Hébergement Bickri</span>
                      <strong>{item.subdomain}</strong>
                    </div>
                  </div>
                </article>
              ))}

              <div className="hostingInfo">
                <div className="hostingIcon">B</div>
                <div>
                  <strong>Hébergez votre site avec une adresse Bickri</strong>
                  <p>
                    Exemple : <b>monentreprise.{process.env.NEXT_PUBLIC_BICKRI_HOSTING_DOMAIN || "bickridomains.com"}</b>.
                    Cette adresse pourra servir de sous-domaine d’hébergement lorsque le domaine Bickri sera configuré.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="cards">
            <div className="card"><div className="price">.com</div><p>Votre identité internationale.</p></div>
            <div className="card"><div className="price">.net</div><p>Pour les projets numériques.</p></div>
            <div className="card"><div className="price">Bickri Hosting</div><p>Un sous-domaine pour héberger votre site.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
