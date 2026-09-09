/**
 * LES PIÈCES DE L'INTERFACE TOUMAÏ, REPRODUITES POUR L'ACCUEIL.
 *
 * POURQUOI UNE REPRODUCTION ET NON LES VRAIS COMPOSANTS
 * ------------------------------------------------------
 * `ChatMessage` tire l'authentification, l'état de conversation, le rendu
 * Markdown, Pyodide, les médias et la moitié du client d'API. Sur une page
 * d'accueil, ce serait plusieurs centaines de kilo-octets de JavaScript pour
 * afficher six phrases qui ne changeront jamais — et le moindre remaniement du
 * chat casserait l'accueil.
 *
 * CE QUI EST COPIÉ, ET CE QUI NE L'EST PAS
 * -----------------------------------------
 * Les VALEURS viennent du produit, relevées dans `components/ChatMessage.tsx`
 * le 09/09/2026 : la bulle de l'utilisateur et son coin bas-droit rentré
 * (`rounded-[20px] rounded-br-[8px]`), la signature « Toumaï AI » en 12 px
 * tertiaire au-dessus des réponses, la ligne d'activité au globe, les pastilles
 * de sources en `rounded-full` bordées, les trois points d'attente, la carte
 * de confirmation avec son intitulé en capitales espacées. La LOGIQUE, elle,
 * n'est pas copiée : rien ici n'appelle le réseau ni ne tient d'état.
 *
 * Si le chat change d'allure, ces pièces devront suivre. C'est le prix de
 * l'indépendance, et il est assumé : `scripts/verifier-demo-accueil.mjs`
 * compare les valeurs des deux côtés et le signale.
 */

import Image from "next/image";

/* ── La fenêtre ────────────────────────────────────────────────────────────
 *
 * LE PRODUIT EST SOMBRE, ET LA PAGE EST CLAIRE.
 *
 * Les jetons du produit vivent sur `:root` dans `app/globals.css`, et la page
 * d'accueil est peinte en crème par `.tmh`. Les redéclarer ici accroche la
 * fenêtre au thème RÉEL de l'application, quel que soit le thème du visiteur :
 * ce qu'il voit est ce qu'il trouvera en ouvrant Toumaï.
 *
 * C'est aussi ce qui casse enfin le rythme crème/terracotta de la page — non
 * par un choix décoratif, mais parce que le produit est réellement comme ça. */
export const JETONS_PRODUIT: React.CSSProperties = {
  ["--background" as string]: "#211d18",
  ["--surface" as string]: "#2a251f",
  ["--card" as string]: "#322c25",
  ["--border" as string]: "#3f382f",
  ["--text-primary" as string]: "#ede7db",
  ["--text-secondary" as string]: "#b5ac9c",
  ["--text-tertiary" as string]: "#857c6b",
  ["--primary" as string]: "#d97757",
  ["--hover" as string]: "rgba(237, 231, 219, 0.07)",
};

export function FenetreProduit({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ ...JETONS_PRODUIT, background: "var(--background)" }}
      className="overflow-hidden rounded-[18px] border border-[var(--border)] shadow-[0_24px_60px_-24px_rgba(28,22,16,.55)]"
    >
      {/* Barre de fenêtre : trois pastilles et le nom. Sobre — ce n'est pas
          elle qu'on vient regarder. */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          {["#4b433a", "#4b433a", "#4b433a"].map((c, i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ background: c }} />
          ))}
        </span>
        <span className="ml-1 text-[11px] tracking-[0.02em] text-[var(--text-tertiary)]">
          Toumaï AI
        </span>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </div>
  );
}

/* ── Les messages ────────────────────────────────────────────────────────── */

/** La bulle de l'utilisateur : alignée à droite, coin bas-droit rentré.
 *  Valeurs relevées dans `ChatMessage.tsx` (bloc `if (isUser)`). */
export function BulleUtilisateur({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-[8px] px-4 py-2.5 text-[14px] leading-relaxed text-[var(--text-primary)] sm:max-w-[76%] sm:text-[15px]"
        style={{
          background: "var(--card)",
          border: "1px solid color-mix(in srgb, var(--text-primary) 7%, transparent)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** La signature au-dessus d'une réponse. Sans elle, réponses et demandes se
 *  lisent comme un seul bloc anonyme — c'est la raison donnée dans le chat. */
export function SignatureToumai() {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Image
        src="/logo.png"
        alt=""
        width={18}
        height={18}
        className="rounded-[5px]"
        aria-hidden="true"
      />
      <span className="text-[12px] tracking-[0.01em] text-[var(--text-tertiary)]">
        Toumaï AI
      </span>
    </div>
  );
}

export function ReponseToumai({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[14px] leading-relaxed text-[var(--text-primary)] sm:text-[15px]">
      {children}
    </div>
  );
}

/* ── L'attente ─────────────────────────────────────────────────────────────
 *
 * « Une recherche web prend plusieurs secondes, et pendant ce temps l'écran ne
 * montrait que trois points : impossible de distinguer "il cherche" de "il est
 * bloqué". » — le commentaire de `ChatMessage.tsx`, et la raison d'être de
 * cette ligne. */
export function LigneActivite({ libelle }: { libelle: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
      <span className="demo-globe flex" aria-hidden="true">
        <IconeGlobe />
      </span>
      {libelle}
    </p>
  );
}

export function PointsDAttente() {
  return (
    <div className="flex items-center gap-1 py-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="demo-point h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)] opacity-40"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/* ── Les sources ─────────────────────────────────────────────────────────── */

export interface Source {
  titre: string;
  domaine: string;
}

export function RangeeSources({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
        <IconeGlobe />
        Web consulté — {sources.length} source{sources.length > 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => (
          <span
            key={s.titre}
            className="flex max-w-[200px] items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            <IconeLien />
            <span className="truncate">{s.titre}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── La confirmation ───────────────────────────────────────────────────────
 *
 * C'est la pièce qui porte l'argument du produit : Toumaï prépare, la personne
 * décide. Reproduite au mot près de `ToolConfirmCard` — « Action en attente de
 * confirmation », puis « … — cette action sera réellement exécutée. » */
export function CarteConfirmation({
  action,
  confirme = false,
}: {
  action: string;
  confirme?: boolean;
}) {
  return (
    <div className="mt-3 max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="px-4 pb-3 pt-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
          Action en attente de confirmation
        </p>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {action} — cette action sera réellement exécutée.
        </p>
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
        {confirme ? (
          <span className="text-xs text-[var(--text-secondary)]">
            Envoyé. La conversation a été mise à jour.
          </span>
        ) : (
          <>
            <span
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              Confirmer
            </span>
            <span className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              Annuler
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Le fichier joint ──────────────────────────────────────────────────────
 *
 * La puce que le chat affiche sous une demande portant un document. */
export function PuceFichier({ nom, poids }: { nom: string; poids: string }) {
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
      <IconeFichier />
      {nom} · {poids}
    </span>
  );
}

/* ── Icônes ────────────────────────────────────────────────────────────────
 *
 * Recopiées trait pour trait du chat : même `viewBox`, même épaisseur. */

function IconeGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  );
}

function IconeLien() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" />
    </svg>
  );
}

function IconeFichier() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}
