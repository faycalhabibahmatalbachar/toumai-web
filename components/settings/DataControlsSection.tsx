"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Panel, Row } from "./Rows";

export function DataControlsSection() {
  return (
    <Panel title="Contrôle des données">
      <Row
        label="Choix de confidentialité"
        description="Décidez comment vos contenus peuvent être utilisés pour améliorer Toumaï AI."
      >
        <SettingsLink href="/privacy-choices">Gérer</SettingsLink>
      </Row>
      <Row
        label="Supprimer le compte"
        description="Consultez les conséquences et la procédure avant toute suppression définitive."
      >
        <SettingsLink href="/delete-account" danger>
          Consulter
        </SettingsLink>
      </Row>
    </Panel>
  );
}

function SettingsLink({
  href,
  children,
  danger = false,
}: {
  href: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-[var(--cx-hover)] focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        borderColor: danger ? "color-mix(in srgb, var(--cx-error) 35%, transparent)" : "var(--cx-border-strong)",
        color: danger ? "var(--cx-error-text)" : "var(--cx-text-secondary)",
      }}
    >
      {children}
      <ArrowRight size={13} strokeWidth={2} />
    </Link>
  );
}
