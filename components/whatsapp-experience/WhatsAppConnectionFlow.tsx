"use client";

import { useState } from "react";
import { ArrowLeft, KeyRound, QrCode } from "lucide-react";
import { WhatsAppConnectorCard, type WhatsAppConnectorIntent } from "@/components/chat/WhatsAppConnectorCard";

export type WhatsAppConnectionMode = "qr" | "pairing";

export function WhatsAppConnectionFlow({
  expired = false,
  onBack,
}: {
  expired?: boolean;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<WhatsAppConnectionMode>("qr");
  const intent: WhatsAppConnectorIntent = mode === "qr"
    ? expired ? "reconnect" : "connect"
    : "pairing_code";

  return (
    <section className="w-full" data-testid="wa-v2-connection-flow" aria-label="Connexion WhatsApp">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          data-testid="wa-v2-connection-back"
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Actions
        </button>
        <div className="text-right">
          <p className="text-[12px] font-semibold text-[var(--text-primary)]">{expired ? "Reconnecter WhatsApp" : "Connecter WhatsApp"}</p>
          <p className="text-[10.5px] text-[var(--text-tertiary)]">Choisissez une méthode sécurisée</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2" role="tablist" aria-label="Méthode de connexion">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "qr"}
          data-testid="wa-v2-connection-mode-qr"
          onClick={() => setMode("qr")}
          className={`flex min-h-14 items-center gap-2 rounded-2xl border px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${mode === "qr" ? "border-[var(--text-tertiary)] bg-[var(--hover)]" : "border-[var(--border)] bg-[var(--card)]"}`}
        >
          <QrCode className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
          <span>
            <span className="block text-[12px] font-semibold text-[var(--text-primary)]">QR code</span>
            <span className="block text-[10.5px] text-[var(--text-tertiary)]">Scanner depuis WhatsApp</span>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pairing"}
          data-testid="wa-v2-connection-mode-pairing"
          onClick={() => setMode("pairing")}
          className={`flex min-h-14 items-center gap-2 rounded-2xl border px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${mode === "pairing" ? "border-[var(--text-tertiary)] bg-[var(--hover)]" : "border-[var(--border)] bg-[var(--card)]"}`}
        >
          <KeyRound className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
          <span>
            <span className="block text-[12px] font-semibold text-[var(--text-primary)]">Code</span>
            <span className="block text-[10.5px] text-[var(--text-tertiary)]">Code de couplage temporaire</span>
          </span>
        </button>
      </div>

      <div data-testid={`wa-v2-connection-panel-${mode}`}>
        {/* The attempt identity changes only when the user changes method.
            Canonical state naturally moves expired -> qr/connecting while the
            same attempt is active; remounting on that transition would start a
            second QR request and invalidate the code already shown. */}
        <WhatsAppConnectorCard key={mode} intent={intent} />
      </div>
    </section>
  );
}
