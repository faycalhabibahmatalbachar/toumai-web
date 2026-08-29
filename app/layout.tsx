import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { CookieConsent } from "@/components/CookieConsent";
import { AnalyticsInit } from "@/components/AnalyticsInit";

// Applique le thème sauvegardé AVANT le premier rendu — évite un flash du
// mauvais thème (dark forcé puis bascule vers light) au chargement.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('toumai_theme');
    var theme = stored || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif éditoriale (titres landing, accueil du chat) — chargée à la racine
// pour être disponible sur toutes les pages via .landing-serif.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Toumaï AI — Assistant IA tchadien gratuit (chat, images, WhatsApp)",
    template: "%s · Toumaï AI",
  },
  description:
    "Toumaï AI, l'intelligence artificielle tchadienne : chat gratuit en français et arabe tchadien, génération d'images, WhatsApp, e-mail, agenda et agent navigateur. Créé par Faycal Habib Ahmat.",
  keywords: [
    "Toumaï AI",
    "toumai ai",
    "toumai",
    "toumaiai",
    "AI Tchad",
    "IA Tchad",
    "IA tchadienne",
    "intelligence artificielle Tchad",
    "intelligence artificielle africaine",
    "assistant IA français",
    "assistant IA Afrique",
    "chatbot gratuit",
    "chat IA gratuit",
    "IA WhatsApp",
    "génération d'images gratuite",
    "ChatGPT Tchad",
    "ChatGPT en français",
    "IA arabe tchadien",
    "IA N'Djamena",
    "Faycal Habib Ahmat",
  ],
  metadataBase: new URL("https://toumaiai.com"),
  alternates: { canonical: "https://toumaiai.com" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Toumaï AI — L'assistant IA tchadien",
    description:
      "Chat IA gratuit, images, WhatsApp, agenda et agent navigateur — en français et arabe tchadien.",
    url: "https://toumaiai.com",
    siteName: "Toumaï AI",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toumaï AI — L'assistant IA tchadien",
    description: "Chat IA gratuit, images, WhatsApp, agenda — français et arabe tchadien.",
    images: ["/og-image.png"],
  },
  authors: [{ name: "Faycal Habib Ahmat", url: "https://toumaiai.com" }],
  creator: "Faycal Habib Ahmat",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

// Données structurées Google — TROIS entités, pas une.
//
// Un seul bloc `SoftwareApplication` décrit le produit, mais ne dit ni qui
// l'édite, ni qu'un site existe autour. Google relie les trois : c'est ce
// graphe qui permet un panneau de connaissance sur « Toumaï AI » et des liens
// de site dans les résultats — pas une liste de mots-clés, ignorée depuis 2009.
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://toumaiai.com/#app",
      name: "Toumaï AI",
      alternateName: ["Toumai AI", "ToumaiAI", "IA tchadienne", "AI Tchad"],
      url: "https://toumaiai.com",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web, Android",
      description:
        "Assistant d'intelligence artificielle tchadien : chat en français, arabe et arabe tchadien, génération d'images, WhatsApp, e-mail, agenda et agent navigateur.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "XAF" },
      inLanguage: ["fr", "ar"],
      author: { "@id": "https://toumaiai.com/#createur" },
      publisher: { "@id": "https://toumaiai.com/#organisation" },
    },
    {
      "@type": "Organization",
      "@id": "https://toumaiai.com/#organisation",
      name: "Toumaï AI",
      url: "https://toumaiai.com",
      logo: "https://toumaiai.com/logo.png",
      // Le pays compte : c'est lui qui rattache la marque au Tchad dans les
      // requêtes locales, bien plus sûrement qu'un mot-clé répété.
      areaServed: { "@type": "Country", name: "Tchad" },
      foundingLocation: { "@type": "Place", name: "N'Djamena, Tchad" },
      founder: { "@id": "https://toumaiai.com/#createur" },
    },
    {
      "@type": "Person",
      "@id": "https://toumaiai.com/#createur",
      name: "Faycal Habib Ahmat",
      jobTitle: "Ingénieur en intelligence artificielle",
      nationality: "TD",
      url: "https://toumaiai.com",
    },
    {
      "@type": "WebSite",
      "@id": "https://toumaiai.com/#site",
      url: "https://toumaiai.com",
      name: "Toumaï AI",
      inLanguage: "fr",
      publisher: { "@id": "https://toumaiai.com/#organisation" },
    },
  ],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/* Scripts dans <head> : exécutés depuis le HTML serveur (l'init du
          thème doit tourner AVANT la première peinture), et React ne les
          re-rend plus côté client dans le body (avertissement React 19). */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthProvider>
            <MaintenanceGate />
            <AnalyticsInit />
            {children}
            <CookieConsent />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
