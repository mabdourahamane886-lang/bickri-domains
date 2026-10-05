"use client";

import { FormEvent, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signup, setSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setMsg("Veuillez renseigner votre e-mail et votre mot de passe.");
      return;
    }
    if (password.length < 6) {
      setMsg("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (signup && name.trim().length < 2) {
      setMsg("Veuillez renseigner votre nom complet.");
      return;
    }

    setLoading(true);
    setMsg("");
    const supabase = createBrowserSupabaseClient();

    try {
      const result = signup
        ? await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

      if (result.error) {
        setMsg(
          result.error.message.includes("Invalid login credentials")
            ? "E-mail ou mot de passe incorrect."
            : result.error.message
        );
        return;
      }

      if (signup && !result.data.session) {
        setMsg("Compte créé. Vérifiez votre e-mail pour confirmer votre compte, puis connectez-vous.");
        return;
      }

      if (!result.data.session) {
        setMsg("Connexion non établie. Veuillez réessayer.");
        return;
      }

      await supabase.auth.getUser();
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMsg("Impossible de contacter le service de connexion. Vérifiez votre connexion Internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <a href="/" className="authBrand">Bickri <span>Domains</span></a>
        <div className="authBadge">ESPACE CLIENT</div>
        <h1>{signup ? "Créer votre compte" : "Bienvenue sur Bickri Domains"}</h1>
        <p className="mutedAuth">
          {signup
            ? "Créez votre compte pour acheter des domaines et gérer vos sites."
            : "Connectez-vous pour gérer vos domaines, sites, DNS et déploiements."}
        </p>

        <form onSubmit={submit}>
          {signup && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom complet"
              autoComplete="name"
              required
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            autoComplete="email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            minLength={6}
            autoComplete={signup ? "new-password" : "current-password"}
            required
          />
          <button className="button authButton" disabled={loading}>
            {loading ? "Connexion…" : signup ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        {msg && <div className="authMsg" role="alert">{msg}</div>}

        <button
          type="button"
          className="switchAuth"
          onClick={() => {
            setSignup(!signup);
            setMsg("");
          }}
        >
          {signup ? "J’ai déjà un compte" : "Créer un compte"}
        </button>

        <a className="backHome" href="/">← Retour à Bickri Domains</a>
      </div>
    </main>
  );
}
