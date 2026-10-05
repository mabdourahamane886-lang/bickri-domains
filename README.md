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
