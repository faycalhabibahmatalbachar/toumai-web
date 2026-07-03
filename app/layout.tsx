import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

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

export const metadata: Metadata = {
  title: "Toumaï AI — Votre assistant IA, toujours là",
  description:
    "Toumaï AI : discutez avec Sao 4 (code) et Toumaï 5 (raisonnement avancé), générez des images, connectez WhatsApp/Mail/Agenda, laissez l'IA naviguer le web pour vous.",
  metadataBase: new URL("https://toumaiai.com"),
  openGraph: {
    title: "Toumaï AI",
    description: "Votre assistant IA, toujours là.",
    url: "https://toumaiai.com",
    siteName: "Toumaï AI",
    locale: "fr_FR",
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
