import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Choix de confidentialité",
  description: "Contrôlez ce que Toumaï AI peut voir et faire — connecteurs, partage, données.",
};

const CHOICES = [
  {
    title: "Permissions WhatsApp",
    desc: "Autorisez ou bloquez chaque capacité de l'IA sur votre compte : messages, vocaux, images, documents, statuts, lecture, résumés, contacts, fonctions avancées — et l'audience de vos statuts.",
    action: "Paramètres → Connecteurs → WhatsApp → Gérer les permissions",
    href: "/settings?tab=connectors",
  },
  {
    title: "Connecteurs",
    desc: "Chaque connecteur (WhatsApp, Mail, Google Agenda) est optionnel et déconnectable en un clic. Déconnecté, l'IA perd immédiatement tout accès.",
    action: "Paramètres → Connecteurs",
    href: "/settings?tab=connectors",
  },
  {
    title: "Partage de conversations",
    desc: "Vous choisissez la visibilité (lien secret ou public) et l'anonymat au moment du partage, et pouvez révoquer un lien à tout moment.",
    action: "Bouton Partager dans une conversation",
    href: "/chat",
  },
  {
    title: "Vos conversations et fichiers",
    desc: "Supprimez une conversation (et son historique serveur), un document ou une image générée à tout moment — la suppression est immédiate.",
    action: "Menu ⋯ d'une conversation · Bibliothèque",
    href: "/library",
  },
  {
    title: "Notifications",
    desc: "Choisissez ce que Toumaï AI a le droit de vous signaler (WhatsApp, agenda, suggestions).",
    action: "Paramètres → Notifications",
    href: "/settings?tab=notifications",
  },
  {
    title: "Suppression du compte",
    desc: "Sur demande, nous supprimons votre compte et l'ensemble des données associées.",
    action: "contact@toumaiai.com",
    href: "mailto:contact@toumaiai.com",
  },
];

export default function PrivacyChoicesPage() {
  return (
    <LegalLayout title="Choix de confidentialité" updated="5 juillet 2026">
      <p>
        Toumaï AI est conçu sur un principe simple : <strong>c&apos;est vous qui décidez</strong>.
        Voici tous les contrôles à votre disposition, et où les trouver.
      </p>
      <div className="mt-8 space-y-4">
        {CHOICES.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <h3 className="!mt-0 text-[15px] font-semibold text-[var(--text-primary)]">{c.title}</h3>
            <p className="mt-1.5 !mb-2 text-sm">{c.desc}</p>
            <Link
              href={c.href}
              className="text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              {c.action} →
            </Link>
          </div>
        ))}
      </div>
    </LegalLayout>
  );
}
