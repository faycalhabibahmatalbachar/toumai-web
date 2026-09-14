import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Automatisations WhatsApp — Toumaï AI" },
  description: "Planifiez, suspendez et contrôlez vos tâches WhatsApp dans Toumaï AI.",
  robots: { index: false, follow: false },
};

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
