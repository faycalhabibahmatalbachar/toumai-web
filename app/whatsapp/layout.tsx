import type { Metadata } from "next";

export const metadata: Metadata = {
 title: { absolute: "Tableau de bord WhatsApp — Toumaï AI" },
 description: "Gérez votre connexion WhatsApp, vos autorisations et votre activité dans Toumaï AI. Un compte connecté est nécessaire.",
 robots: { index: false, follow: false },
 alternates: { canonical: "https://toumaiai.com/whatsapp/", languages: {} },
};
export default function WhatsAppLayout({children}:{children:React.ReactNode}) { return children; }
