# Bickri Domains

Plateforme de gestion et de vente de noms de domaine.

## Stack
- Next.js App Router + TypeScript
- Supabase Auth/Postgres/RLS
- Provider abstraction for registrar APIs
- FCFA/XOF pricing

## Configuration
Copy `.env.example` to `.env.local` and add the Supabase publishable credentials. Never commit service-role or registrar secrets.

## Domain provider
The first implementation uses an explicit mock provider so the UI can be developed safely. A real registrar/reseller adapter must be configured before any real .com registration or payment is enabled.


## Fonctionnalités Bickri Domains
- Recherche multi-TLD et affichage des disponibilités/prix.
- Panier client pour les domaines.
- Espace client pour domaines, panier, hébergement, transferts, renouvellements, DNS et factures.
- Création de sites hébergés sur sous-domaines Bickri.
- Routage wildcard prévu pour `*.bickridomains.com`.
- Tables Supabase protégées par RLS pour panier, paiements, transferts, renouvellements, factures et sites hébergés.

## Important
Le provider de registrar reste `mock` tant qu'un registrar réel n'est pas configuré. Aucun enregistrement .com réel ni paiement réel ne doit être présenté comme actif avant la connexion d'un fournisseur et d'un moyen de paiement.
