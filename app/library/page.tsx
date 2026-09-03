"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  deleteFile,
  fileUrl,
  getChatImages,
  getFiles,
  isImage,
  type LibraryImage,
  type DocumentFile,
  type GeneratedFile,
} from "@/lib/library-api";
import { LigneFichier } from "@/components/library/LigneFichier";

const FILE_TYPE_ICON: Record<string, string> = {
  cv: "📄",
  letter: "✉️",
  report: "📊",
  excel: "📈",
  pdf: "📕",
  docx: "📝",
  xlsx: "📈",
  image: "🖼️",
  other: "📎",
};

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** L'étiquette du groupe « sans dossier ».

 *
 * Un caractère qu'aucun nom de dossier ne peut porter — le serveur coupe les
 * espaces et refuse le vide —, pour qu'il ne puisse jamais entrer en collision
 * avec un vrai dossier qu'on aurait nommé « Racine ». */
const RACINE = "\u0000";

/** Groupe par dossier : la racine d'abord, puis l'ordre alphabétique.
 *
 * La racine en tête parce que c'est là qu'arrive tout ce qui est récent —
 * reléguer le non-classé en bas ferait chercher ce qu'on vient de créer. */
function grouper<T extends { f: { folder?: string | null } }>(
  items: T[],
): [string, T[]][] {
  const par = new Map<string, T[]>();
  for (const it of items) {
    const cle = (it.f.folder || "").trim() || RACINE;
    const liste = par.get(cle);
    if (liste) liste.push(it);
    else par.set(cle, [it]);
  }
  return [...par.entries()].sort(([a], [b]) =>
    a === RACINE ? -1 : b === RACINE ? 1 : a.localeCompare(b, "fr"),
  );
}

export default function LibraryPage() {
  const { session, loading, loginAsGuest } = useAuth();
  const [generated, setGenerated] = useState<GeneratedFile[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [chatImages, setChatImages] = useState<LibraryImage[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const guestAttempted = useRef(false);

  useEffect(() => {
    if (loading || session || guestAttempted.current) return;
    guestAttempted.current = true;
    loginAsGuest().catch(() => {});
  }, [loading, session, loginAsGuest]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      getFiles(),
      getChatImages().catch(() => ({ images: [] as LibraryImage[] })),
    ])
      .then(([data, imgs]) => {
        setGenerated(data.generated);
        setDocuments(data.documents);
        setChatImages(imgs.images);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setFetching(false));
  }, [session]);

  async function remove(id: string, kind: "generated" | "document") {
    setDeletingId(id);
    try {
      await deleteFile(id);
      if (kind === "generated") setGenerated((prev) => prev.filter((f) => f.id !== id));
      else setDocuments((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // Échec silencieux — le fichier reste visible, pas d'état incohérent.
    } finally {
      setDeletingId(null);
    }
  }

  /** Applique un renommage ou un déplacement à la liste locale.
   *
   * Le serveur a déjà répondu quand on arrive ici : on n'affiche donc jamais
   * un nom que la base n'a pas accepté. Recharger toute la bibliothèque pour
   * un seul champ ferait clignoter la page entière et perdre la position de
   * défilement. */
  function appliquer(
    id: string,
    kind: "generated" | "document",
    patch: { filename?: string; folder?: string | null },
  ) {
    const maj = <T extends { id: string }>(prev: T[]) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
    if (kind === "generated") setGenerated(maj);
    else setDocuments(maj);
  }

  const images = generated.filter((f) => isImage(f.file_type));
  const nonImageGenerated = generated.filter((f) => !isImage(f.file_type));

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <Link href="/chat" aria-label="Retour au chat" className="rounded-lg p-2 transition hover:bg-[var(--hover)]">
          <BackIcon />
        </Link>
        <h1 className="text-sm font-semibold">Bibliothèque</h1>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {(fetching || !session) && (
          <div className="space-y-3" aria-hidden="true">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-[var(--card)]" />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-[var(--error)]">{error}</p>}

        {session && !fetching && !error && (
          <>
            <section className="mb-10">
              <h2 className="mb-3 text-lg font-semibold">Documents</h2>
              {nonImageGenerated.length === 0 && documents.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">
                  Les CV, lettres et rapports que Toumaï AI génère pour vous apparaîtront ici.
                </p>
              ) : (
                <div className="space-y-5">
                  {/* GROUPÉ PAR DOSSIER.
                      « Déplacer » ne servirait à rien si la bibliothèque
                      continuait d'afficher une liste plate : ranger sans voir
                      le rangement, c'est ranger pour personne. */}
                  {grouper([
                    ...nonImageGenerated.map((f) => ({
                      f,
                      icone: FILE_TYPE_ICON[f.file_type] ?? "\u{1F4CE}",
                      sous: formatDate(f.created_at),
                      genre: "generated" as const,
                    })),
                    ...documents.map((f) => ({
                      f,
                      icone: FILE_TYPE_ICON[f.file_type ?? "other"] ?? "\u{1F4CE}",
                      sous:
                        formatDate(f.created_at) +
                        (f.file_size ? ` \u00B7 ${formatSize(f.file_size)}` : ""),
                      genre: "document" as const,
                    })),
                  ]).map(([dossier, items]) => (
                    <div key={dossier}>
                      {dossier !== RACINE && (
                        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--text-tertiary)]">
                          {dossier}
                        </p>
                      )}
                      <div className="space-y-2">
                        {items.map(({ f, icone, sous, genre }) => (
                          <LigneFichier
                            key={f.id}
                            fichier={f}
                            icone={icone}
                            sousTitre={sous}
                            suppressionEnCours={deletingId === f.id}
                            onSupprimer={() => remove(f.id, genre)}
                            onChange={(patch) => appliquer(f.id, genre, patch)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Contenus multimédias</h2>
              {chatImages.length === 0 && images.length === 0 && (
                <p className="text-sm text-[var(--text-tertiary)]">
                  Les images générées par Toumaï AI apparaîtront ici.
                </p>
              )}
              {chatImages.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {chatImages.map((img, i) => (
                    <div
                      key={img.url + i}
                      className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-[var(--card)]"
                      onClick={() => setPreview(img.url)}
                      role="button"
                      tabIndex={0}
                      aria-label="Agrandir l'image"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.session_title}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                      <Link
                        href={`/chat?c=${encodeURIComponent(img.session_id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"
                      >
                        {img.session_title}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              {images.length === 0 ? null : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((f) => (
                    <a
                      key={f.id}
                      href={fileUrl(f.storage_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-2xl bg-[var(--card)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl(f.storage_path)}
                        alt={f.filename}
                        className="h-full w-full object-cover transition group-hover:opacity-80"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          remove(f.id, "generated");
                        }}
                        aria-label="Supprimer"
                        disabled={deletingId === f.id}
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
                      >
                        <TrashIcon />
                      </button>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Aperçu" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
