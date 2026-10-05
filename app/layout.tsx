import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"Bickri Domains",description:"Recherche et gestion de noms de domaine avec Bickri Domains."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}