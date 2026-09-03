"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fileUrl, listFolders, updateFile } from "@/lib/library-api";

export interface FichierBiblio {
  id: string;
  filename: string;
  storage_path: string;
  file_type?: string | null;
  file_size?: number | null;
  folder?: string | null;
  created_at: string;
}

/**
 * Une ligne de la bibliothèque, avec son menu.
 *
 * POURQUOI UN COMPOSANT PLUTÔT QUE DEUX BLOCS
 * --------------------------------------------
 * La page dessinait la même ligne deux fois — une pour les fichiers engendrés,
 * une pour les documents déposés — avec pour seule différence l'icône. Toute
 * amélioration devait donc être écrite deux fois, et il suffisait d'en oublier
 * une pour que la moitié de la bibliothèque se comporte autrement.
 *
 * CE QUE LE MENU PERMET, ET CE QU'IL NE PROMET PAS
 * -------------------------------------------------
 * Cinq gestes, tous réels : en discuter, télécharger, renommer, déplacer,
 * supprimer. Aucun n'est là pour faire nombre — « Déplacer » écrit vraiment
 * une étiquette qui persiste, et « Supprimer » libère vraiment la place sur
 * le stockage, ce que l'ancienne version ne faisait pas.
 */
export function LigneFichier({
  fichier,
  icone,
  sousTitre,
  onSupprimer,
  onChange,
  suppressionEnCours,
}: {
  fichier: FichierBiblio;
  icone: string;
  sousTitre: string;
  onSupprimer: () => void;
  onChange: (patch: { filename?: string; folder?: string | null }) => void;
  suppressionEnCours: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<"aucun" | "renommer" | "deplacer">("aucun");
  const [brouillon, setBrouillon] = useState("");
  const [dossiers, setDossiers] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur ET à Échap. Un menu qu'on ne peut fermer qu'en
  // recliquant sur son bouton piège la personne qui l'a ouvert par erreur.
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  function enDiscuter() {
    setOuvert(false);
    // On POSE la question, on ne pré-remplit pas : la personne a déjà choisi
    // le fichier, lui faire appuyer une seconde fois sur Entrée pour la même
    // intention serait un geste de trop.
    try {
      window.sessionStorage.setItem(
        "toumai:question",
        `À propos de mon fichier « ${fichier.filename} » : `,
      );
    } catch {
      // Stockage refusé : on emmène quand même vers la conversation.
    }
    router.push("/chat");
  }

  async function ouvrirDeplacement() {
    setOuvert(false);
    setMode("deplacer");
    setBrouillon(fichier.folder ?? "");
    // La liste arrive APRÈS l'ouverture : attendre le réseau pour afficher un
    // champ qu'on peut déjà remplir à la main ferait patienter pour rien.
    listFolders().then(setDossiers).catch(() => {});
  }

  async function enregistrer() {
    const v = brouillon.trim();
    const patch =
      mode === "renommer" ? { filename: v } : { folder: v };
    if (mode === "renommer" && !v) {
      setErreur("Le nom ne peut pas être vide.");
      return;
    }
    if (mode === "renommer" && v === fichier.filename) {
      setMode("aucun");
      return;
    }
    setErreur(null);
    try {
      await updateFile(fichier.id, patch);
      onChange(mode === "renommer" ? { filename: v } : { folder: v || null });
      setMode("aucun");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible");
    }
  }

  if (mode !== "aucun") {
    return (
      <div className="rounded-2xl bg-[var(--card)] px-4 py-3">
        <p className="mb-2 text-xs text-[var(--text-tertiary)]">
          {mode === "renommer"
            ? "Nouveau nom du fichier"
            : "Dossier — laissez vide pour le remettre à la racine"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") enregistrer();
              else if (e.key === "Escape") setMode("aucun");
            }}
            list={mode === "deplacer" ? `dossiers-${fichier.id}` : undefined}
            className="min-w-0 flex-1 rounded-lg border border-[var(--primary)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
          />
          {/* Les dossiers existants sont PROPOSÉS, jamais imposés : on peut en
              créer un nouveau en tapant, et retrouver les anciens sans les
              réécrire — c'est ce qui évite « Factures » et « factures » côte
              à côte. */}
          {mode === "deplacer" && (
            <datalist id={`dossiers-${fichier.id}`}>
              {dossiers.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          )}
          <button
            onClick={() => setMode("aucun")}
            className="rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            Annuler
          </button>
          <button
            onClick={enregistrer}
            className="rounded-lg px-3 py-2 text-xs font-medium text-white transition"
            style={{ background: "var(--primary)" }}
          >
            Enregistrer
          </button>
        </div>
        {erreur && <p className="mt-2 text-xs text-[var(--error)]">{erreur}</p>}
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-2xl bg-[var(--card)] px-4 py-3 transition hover:bg-[var(--hover)]">
      <span className="text-xl" aria-hidden="true">
        {icone}
      </span>
      <a
        href={fileUrl(fichier.storage_path)}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <span className="block truncate text-sm font-medium">{fichier.filename}</span>
        <span className="block text-xs text-[var(--text-tertiary)]">{sousTitre}</span>
      </a>

      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setOuvert((o) => !o)}
          aria-label="Options du fichier"
          aria-expanded={ouvert}
          className={`rounded-lg p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)] ${
            ouvert ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {suppressionEnCours ? "…" : <PointsIcon />}
        </button>

        {ouvert && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
            <Entree onClick={enDiscuter} icone={<ChatIcon />} texte="En discuter" />
            <a
              href={fileUrl(fichier.storage_path)}
              download={fichier.filename}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOuvert(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
            >
              <TelechargerIcon />
              Télécharger
            </a>
            <Entree
              onClick={() => {
                setOuvert(false);
                setMode("renommer");
                setBrouillon(fichier.filename);
              }}
              icone={<CrayonIcon />}
              texte="Renommer"
            />
            <Entree onClick={ouvrirDeplacement} icone={<DossierIcon />} texte="Déplacer" />

            <div className="my-1 h-px bg-[var(--border)]" />

            {/* SEUL ET EN DERNIER : le geste irréversible ne doit pas voisiner
                avec ceux qu'on fait sans réfléchir. */}
            <Entree
              onClick={() => {
                setOuvert(false);
                onSupprimer();
              }}
              icone={<CorbeilleIcon />}
              texte="Supprimer"
              danger
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Entree({
  onClick,
  icone,
  texte,
  danger = false,
}: {
  onClick: () => void;
  icone: React.ReactNode;
  texte: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)] ${
        danger ? "text-[var(--error)]" : ""
      }`}
    >
      {icone}
      {texte}
    </button>
  );
}

/* ── Icônes ──────────────────────────────────────────────────────────────── */

const svg = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PointsIcon() {
  return (
    <svg {...svg} width={16} height={16} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...svg}>
      <path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.8-.8L3 21l1.9-5.1A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z" />
    </svg>
  );
}

function TelechargerIcon() {
  return (
    <svg {...svg}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function CrayonIcon() {
  return (
    <svg {...svg}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function DossierIcon() {
  return (
    <svg {...svg}>
      <path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function CorbeilleIcon() {
  return (
    <svg {...svg}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
    </svg>
  );
}
