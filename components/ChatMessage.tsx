"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { confirmToolAction, sendFeedback } from "@/lib/chat-api";
import type { ToolConfirmation, WebSource, SearchImage } from "@/lib/chat-stream";
import { CodeBlock } from "./CodeBlock";
import { SiteBuildingCard, SiteArtifactCard, extractHtml } from "./SiteBuilder";
import { ProjectCard } from "./ProjectViewer";
import { parseProject, hasPatches, parseSearchReplace, applyPatches } from "@/lib/project-parser";
import { MediaMessage, imagesFromUrls } from "./chat/media/MediaMessage";
import type { ChatImage } from "./chat/media/types";
import type { ResponseBlock } from "@/lib/chat-response";
import { RichResponseBlocks } from "./chat/RichResponseBlocks";
import { ReasoningPanel } from "./chat/ReasoningPanel";
import { Logo } from "./Logo";
import { useSpeakText } from "@/hooks/useSpeakText";
import { WhatsAppConnectorCard } from "./chat/WhatsAppConnectorCard";
import type { WhatsAppChatIntent } from "@/lib/whatsapp-intents";

/** Extrait le HTML de base d'un message d'édition (qui embarque le code du
 * site dans un bloc ```html) pour appliquer un patch. */
function baseHtmlFrom(content?: string): string | null {
  if (!content) return null;
  return extractHtml(content);
}

/** Détecte un bloc ```html en cours d'écriture (ouvert mais pas encore fermé)
 * dans un message en streaming — renvoie le code déjà reçu, ou null. */
function pendingHtmlCode(content: string): string | null {
  const m = content.match(/```html[^\n]*\n?/i);
  if (!m || m.index === undefined) return null;
  const after = content.slice(m.index + m[0].length);
  if (after.includes("```")) return null; // bloc déjà fermé
  return after;
}

function linkifySourceCitations(markdown: string, sources?: WebSource[]): string {
  if (!markdown || !sources?.length) return markdown;
  // Ne jamais réécrire les blocs de code : “[1]” peut y être une donnée.
  return markdown
    .split(/(```[\s\S]*?```)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part.replace(/\[(\d{1,2})\]/g, (raw, nRaw: string) => {
        const n = Number(nRaw);
        const source = sources[n - 1];
        if (!source?.url) return raw;
        try {
          const url = new URL(source.url);
          if (url.protocol !== "https:" && url.protocol !== "http:") return raw;
          return `[[${n}]](${url.toString()} "Source ${n}")`;
        } catch {
          return raw;
        }
      });
    })
    .join("");
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  /** Présent une fois le message persisté côté backend — nécessaire pour le feedback. */
  serverId?: string;
  /** Instant d'envoi, en ISO 8601.
   *
   * Le fil n'en portait aucun : en remontant une longue conversation, rien ne
   * disait si une question datait de ce matin ou du mois dernier. Le jour
   * s'affiche sous le message, l'heure exacte au survol — la précision à la
   * minute encombre quand on ne la cherche pas. */
  envoyeLe?: string;
  imageUrls?: string[];
  /** La pièce jointe envoyée AVEC ce message.
   *
   * Elle n'y figurait pas : on joignait une image, on envoyait, et le fil
   * n'en gardait aucune trace — impossible de savoir, en relisant, sur quoi
   * portait la question. `apercu` est une adresse locale (`blob:`) valable
   * le temps de l'onglet ; le nom reste comme repli après rechargement. */
  piece?: {
    id?: string;
    nom: string;
    apercu?: string;
    type?: string;
    taille?: number;
    pages?: number;
  };
  pieces?: Array<{
    id?: string;
    nom: string;
    apercu?: string;
    type?: string;
    taille?: number;
    pages?: number;
  }>;
  /** Action sensible en attente (WhatsApp, mail…) — affiche la carte
   * Confirmer/Annuler qui déclenche la VRAIE exécution côté backend. */
  toolConfirmation?: ToolConfirmation;
  /** Sources et images réelles trouvées pendant une recherche web (jamais générées). */
  sources?: WebSource[];
  searchImages?: SearchImage[];
  /** Blocs enrichis ordonnés. Quand présents, ils remplacent le rendu legacy sources/images. */
  blocks?: ResponseBlock[];
  /** Renseigné quand le modèle demandé était indisponible et que la cascade a
   * rétrogradé. Affiché sous la réponse : l'utilisateur doit savoir qui lui a
   * répondu, on ne laisse pas croire qu'il a eu Toumaï 5. */
  modelNotice?: string;
  /** Trace de raisonnement réellement produite par le modèle (panneau
   * « Réflexion »). Absente si le modèle ne raisonne pas — on n'affiche alors
   * aucune promesse de réflexion. */
  reasoning?: string;
  /** Durée mesurée du raisonnement, en millisecondes. */
  reasoningMs?: number;
  /** Action en cours côté serveur avant la réponse (`"web_search"`). */
  activity?: string;
  /** UI live du connecteur WhatsApp. Aucun QR ni secret n’est persisté ici. */
  whatsappConnector?: { intent: WhatsAppChatIntent };
}

const TOOL_LABELS: Record<string, string> = {
  send_whatsapp: "Envoyer sur WhatsApp",
  send_mail: "Envoyer l'e-mail",
  create_event: "Créer l'événement",
};

/** Carte de confirmation d'action sensible — sans elle, le modèle répondait
 * « message envoyé » sans jamais appeler le gateway (aucune vraie action). */
function ToolConfirmCard({ confirmation }: { confirmation: ToolConfirmation }) {
  const [state, setState] = useState<"pending" | "running" | "done" | "cancelled" | "error">(
    "pending",
  );
  const [resultMsg, setResultMsg] = useState("");

  async function confirm() {
    setState("running");
    try {
      const res = await confirmToolAction(confirmation.tool, confirmation.args);
      setState(res.ok ? "done" : "error");
      setResultMsg(res.message || (res.ok ? "Action exécutée." : "Échec de l'action."));
    } catch (err) {
      setState("error");
      setResultMsg(err instanceof Error ? err.message : "Échec de l'action.");
    }
  }

  const label = TOOL_LABELS[confirmation.tool] ?? "Exécuter l'action";

  return (
    <div className="mt-3 max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="px-4 pb-3 pt-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
          Action en attente de confirmation
        </p>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {label} — cette action sera réellement exécutée.
        </p>
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
        {state === "pending" && (
          <>
            <button
              onClick={confirm}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Confirmer
            </button>
            <button
              onClick={() => setState("cancelled")}
              className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
            >
              Annuler
            </button>
          </>
        )}
        {state === "running" && (
          <span className="text-xs text-[var(--text-secondary)]">Exécution en cours…</span>
        )}
        {state === "done" && (
          <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
            ✓ {resultMsg}
          </span>
        )}
        {state === "cancelled" && (
          <span className="text-xs text-[var(--text-tertiary)]">Action annulée.</span>
        )}
        {state === "error" && (
          <span className="text-xs" style={{ color: "var(--error)" }}>
            {resultMsg}
          </span>
        )}
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trombone du résumé « code joint » — remplace l'emoji 📄, hors charte. */
function FileChipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThumbUpIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M7 22V11M2 13v7a2 2 0 002 2h12.6a2 2 0 002-1.6l1.3-6.5a2 2 0 00-2-2.4H14V6a3 3 0 00-3-3l-4 8v9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M17 2v11M22 11V4a2 2 0 00-2-2H7.4a2 2 0 00-2 1.6l-1.3 6.5a2 2 0 002 2.4H10v5a3 3 0 003 3l4-8V2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerStopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="animate-spin"
    >
      <path d="M12 3a9 9 0 019 9" strokeLinecap="round" />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 10-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 107.07 7.07L12.5 19.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Ce que Toumaï fait pendant qu'on attend.
 *
 * Une recherche web prend plusieurs secondes, et pendant ce temps l'écran ne
 * montrait que trois points : impossible de distinguer « il cherche » de « il
 * est bloqué ». Dire l'action, c'est rendre l'attente compréhensible. */
function ActivityLine({ label }: { label: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
      <span className="activity-globe flex" aria-hidden="true">
        <GlobeSmallIcon />
      </span>
      {label}
    </p>
  );
}

function GlobeSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  );
}

/** Liens des pages consultées pendant une recherche web — façon Perplexity. */
function sourceUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function WebSourcesRow({ sources }: { sources: WebSource[] }) {
  const items = sources
    .map((source) => ({ source, url: sourceUrl(source.url) }))
    .filter((item): item is { source: WebSource; url: string } => Boolean(item.url))
    .slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section className="mt-3" aria-label="Sources Web">
      <p className="mb-1.5 flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
        <GlobeSmallIcon />
        Sources — {items.length}
      </p>
      <div className="space-y-1">
        {items.map(({ source: s, url }, i) => {
          const domain = domainFromUrl(url);
          return (
            <details
              id={`source-${i + 1}`}
              key={url + i}
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[var(--hover)] px-1 font-semibold text-[var(--text-primary)]"
                  aria-label={`Source ${i + 1}`}
                >
                  [{i + 1}]
                </span>
                <span className="min-w-0 flex-1 truncate">{s.title || domain}</span>
                <span className="max-w-[35%] truncate text-[11px] text-[var(--text-tertiary)]">
                  {domain}
                </span>
              </summary>
              <div className="border-t border-[var(--border)] px-3 py-2.5">
                {s.snippet ? (
                  <p className="mb-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {s.snippet}
                  </p>
                ) : null}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="inline-flex max-w-full items-center gap-1.5 text-[11px] font-medium text-[var(--primary)] hover:underline"
                >
                  <LinkIcon />
                  <span className="truncate">{url}</span>
                </a>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

/** Images réelles trouvées pendant une recherche web (jamais générées) — galerie
 * horizontale, façon Perplexity/ChatGPT Search. */
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Toumaï AI réfléchit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-40"
          style={{
            animation: "typing-bounce 1.1s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Le jour, dit comme on le dit à l'oral.
 *
 * « Aujourd'hui » et « Hier » plutôt qu'une date : c'est ce qu'on retient
 * réellement, et cela évite de lire « 3 septembre » pour un message envoyé il
 * y a dix minutes. Au-delà d'une semaine la date reprend ses droits, parce que
 * « il y a 34 jours » ne situe plus rien.
 */
function jourDit(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const auj = new Date();
  const jours = Math.round(
    (new Date(auj.getFullYear(), auj.getMonth(), auj.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  if (jours < 7) return d.toLocaleDateString("fr-FR", { weekday: "long" });
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() === auj.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** L'horodatage complet, pour l'infobulle du survol. */
function instantComplet(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({
  message,
  prevContent,
  onEdit,
  editable = true,
  onRegenerate,
  onRetry,
  onSuggest,
  isLast = false,
}: {
  message: Message;
  /** Contenu du message précédent — base HTML pour appliquer un patch d'édition. */
  prevContent?: string;
  onEdit?: (newContent: string) => void;
  editable?: boolean;
  onRegenerate?: () => void;
  /** Renvoie le message tel quel — sans l'éditer.
   *
   * « Réessayer » et « Modifier » répondent à deux gestes différents : l'un
   * quand la réponse a déraillé alors que la question était bonne, l'autre
   * quand c'est la question qu'on veut reformuler. Les confondre oblige à
   * retaper une phrase qui n'avait rien de faux. */
  onRetry?: () => void;
  /** Renvoie une demande d'amélioration dans le chat (suggestions de site). */
  onSuggest?: (text: string) => void;
  /** Dernier message de la conversation : sa barre d'actions reste visible
   * (c'est celle qu'on veut copier, noter ou régénérer) au lieu de n'apparaître
   * qu'au survol. */
  isLast?: boolean;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const speech = useSpeakText();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  function startEdit() {
    setDraft(message.content);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    setEditing(false);
    onEdit?.(trimmed);
  }

  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function rate(value: "up" | "down") {
    if (!message.serverId || rated) return;
    setRated(value);
    try {
      await sendFeedback(message.serverId, value);
    } catch {
      setRated(null);
    }
  }

  if (isUser) {
    if (editing) {
      return (
        <div className="flex animate-fade-in justify-end">
          <div className="flex max-w-[85%] flex-col gap-2 sm:max-w-[70%]">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
              rows={Math.min(8, Math.max(2, draft.split("\n").length))}
              className="w-full resize-none rounded-2xl border border-[var(--primary)] bg-[var(--card)] px-4 py-3 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none"
            />
            {/* CE QUE L'ÉDITION FAIT VRAIMENT, DIT AVANT DE LA FAIRE.
                Modifier ne corrige pas le message en place : cela repart de ce
                point et écarte la suite. Quelqu'un qui l'ignore perd la fin de
                sa conversation sans avoir été prévenu — la phrase coûte une
                ligne, la surprise coûte le fil. */}
            <div className="flex items-center justify-end gap-2">
              <span
                title="Apporter des modifications crée une nouvelle branche dans la conversation."
                className="mr-auto cursor-help text-[11px] text-[var(--text-tertiary)]"
              >
                Crée une nouvelle branche
              </span>
              <button
                onClick={() => setEditing(false)}
                className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                disabled={!draft.trim()}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
                style={{ background: "var(--primary)" }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Message d'ÉDITION de site : contient une consigne + le code exact du site
    // joint. On n'affiche que la consigne, le code est résumé en une puce.
    const editMatch =
      message.content.length > 1500 && /```html\n[\s\S]*```/.test(message.content)
        ? message.content.replace(/```html\n[\s\S]*?```/g, "").trim()
        : null;
    return (
      <div className="msg-row msg-in flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[76%]">
          <div
            className="whitespace-pre-wrap rounded-[20px] rounded-br-[8px] px-4 py-2.5 text-[length:var(--chat-fs,15px)] leading-relaxed text-[var(--text-primary)]"
            style={{
              background: "var(--card)",
              border: "1px solid color-mix(in srgb, var(--text-primary) 7%, transparent)",
            }}
          >
            {editMatch ?? message.content}
            {editMatch && (
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <FileChipIcon /> Code du site joint pour modification
              </span>
            )}
          </div>
          {/* SES PROPRES MESSAGES MÉRITENT LES MÊMES GESTES QUE CEUX DE L'IA.
              Seul « Modifier » existait ici. On ne pouvait ni recopier ce
              qu'on avait écrit — un prompt long qu'on veut réutiliser
              ailleurs — ni relancer une question restée sans bonne réponse
              sans la retaper mot pour mot. */}
          {/* ICONES SEULES.
              Trois libelles cote a cote — Copier, Modifier, Reessayer —
              tenaient plus de place que le message lui-meme sur un telephone
              de 390 px, et repoussaient la bulle. Les icones disent la meme
              chose ; le libelle reste dans `aria-label` et dans l infobulle,
              donc rien n est perdu au clavier ni au lecteur d ecran. */}
          <div className="msg-actions flex items-center gap-0.5">
            <button
              onClick={copy}
              aria-label={copied ? "Copié" : "Copier le message"}
              title={copied ? "Copié" : "Copier"}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            {editable && onEdit && (
              <button
                onClick={startEdit}
                aria-label="Modifier le message"
                title="Modifier"
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
              >
                <EditIcon />
              </button>
            )}
            {editable && onRetry && (
              <button
                onClick={onRetry}
                aria-label="Renvoyer ce message"
                title="Renvoyer la même question"
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
              >
                <RegenerateIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pendant le streaming d'un site : on masque le code brut qui défile et on
  // affiche la carte de construction animée à sa place (le texte avant le bloc
  // reste rendu). Une fois le site terminé, on propose des améliorations.
  const pendingCode = message.streaming ? pendingHtmlCode(message.content || "") : null;
  const building = pendingCode !== null;

  // ÉDITION PAR PATCH : l'IA a renvoyé des blocs SEARCH/REPLACE → on les
  // applique au site précédent (dans le message d'édition juste avant) et on
  // affiche le site MODIFIÉ. Garantit une édition fidèle (pas de recréation).
  const patchedHtml = (() => {
    if (message.streaming || !hasPatches(message.content || "")) return null;
    const base = baseHtmlFrom(prevContent);
    if (!base) return null;
    const { html, applied } = applyPatches(base, parseSearchReplace(message.content || ""));
    return applied > 0 ? html : null;
  })();

  // Projet multi-fichiers terminé (≥2 fichiers nommés) → IDE au lieu des blocs.
  const project = !message.streaming && !patchedHtml ? parseProject(message.content || "") : [];
  const isProject = project.length >= 2;
  // Site terminé d'une page → on affiche l'APERÇU RENDU (pas le code brut).
  const finishedHtml =
    patchedHtml ??
    (!isProject && !message.streaming ? extractHtml(message.content || "") : null);
  const isSite = Boolean(finishedHtml);

  let visibleContent = message.content || "";
  if (building) visibleContent = visibleContent.replace(/```html[\s\S]*$/i, "").trimEnd();
  // Si patch appliqué, on masque les blocs SEARCH/REPLACE (techniques).
  if (patchedHtml) visibleContent = "✅ Modifications appliquées à votre site.";
  // Projet ou site terminé : on retire les blocs de code (rendus par la carte
  // d'aperçu) et on ne garde que le texte narratif.
  if (isProject || isSite) visibleContent = visibleContent.replace(/```[^\n`]*\n[\s\S]*?```/g, "").trim();

  return (
    <div className="msg-row msg-in">
      {/* Signature de la réponse — la marque et son nom, discrets, au-dessus du
          texte : sans eux, réponses et messages de l'utilisateur se lisaient
          comme un seul bloc anonyme. Le nom scintille tant que la réponse
          s'écrit, ce qui rend l'attente visible sans rien promettre de faux. */}
      <div className="mb-2 flex items-center gap-2">
        <Logo size={18} className="rounded-[5px]" />
        <span className={`text-[12px] tracking-[0.01em] ${message.streaming ? "chat-thinking" : "text-[var(--text-tertiary)]"}`}>
          Toumaï AI
        </span>
      </div>
      {message.reasoning && (
        <ReasoningPanel
          reasoning={message.reasoning}
          durationMs={message.reasoningMs}
          streaming={message.streaming}
        />
      )}
      {message.whatsappConnector && (
        <WhatsAppConnectorCard intent={message.whatsappConnector.intent} />
      )}
      <div className="text-[length:var(--chat-fs,15px)] leading-relaxed">
        {message.streaming && message.activity ? (
          <ActivityLine
            label={
              message.activity === "deep_web_search"
                ? "Recherche approfondie sur le Web…"
                : message.activity === "document_analysis"
                  ? "Analyse du document…"
                  : "Recherche sur le Web…"
            }
          />
        ) : null}
        {message.streaming && !message.content ? (
          <TypingDots />
        ) : (
          <div className="prose-toumai">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre(props) {
                  // CodeBlock rend déjà son propre <pre> — évite un double wrapper.
                  return <>{props.children}</>;
                },
                code(props) {
                  const { className, children } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  const isBlock = Boolean(match);
                  // `String(undefined)` vaut la chaîne « undefined ».
                  //
                  // Observé en production : un modèle ouvre une clôture
                  // ```python et la referme sans rien mettre dedans. Le bloc
                  // s'affichait avec le mot `undefined` pour tout contenu,
                  // portait un bouton « Exécuter », et Pyodide faisait ce
                  // qu'on lui demandait — `NameError: name 'undefined' is not
                  // defined`, à la place des messages demandés.
                  const text =
                    children === undefined || children === null
                      ? ""
                      : String(children).replace(/\n$/, "");
                  if (!isBlock) {
                    return <code className={className}>{children}</code>;
                  }
                  // UN BLOC VIDE N'APPREND RIEN À PERSONNE : il ne doit pas
                  // exister. Le rendre `null` le fait disparaître de la
                  // réponse, plutôt que d'y laisser un cadre creux.
                  if (!text.trim()) return null;
                  return <CodeBlock language={match![1]} code={text} />;
                },
                img(props) {
                  // Une image markdown passait en <img> nu : ni squelette de
                  // chargement, ni repli si l'URL casse, ni ouverture en
                  // visionneuse. On la route vers le même widget que les images
                  // générées ou trouvées sur le web.
                  const src = typeof props.src === "string" ? props.src : "";
                  if (!src) return null;
                  return (
                    <MediaMessage
                      images={[{ id: src, url: src, alt: props.alt || undefined }]}
                    />
                  );
                },
              }}
            >
              {linkifySourceCitations(visibleContent, message.sources)}
            </ReactMarkdown>
            {building && <SiteBuildingCard code={pendingCode ?? ""} />}
            {isProject && <ProjectCard content={message.content || ""} onSuggest={onSuggest} />}
            {isSite && finishedHtml && <SiteArtifactCard html={finishedHtml} onSuggest={onSuggest} />}
          </div>
        )}
        {/* PAS DE CURSEUR CLIGNOTANT.
            Il imitait une saisie en cours, mais le texte apparaît déjà par
            morceaux : le mouvement du texte dit à lui seul que la réponse
            s'écrit. La barre n'ajoutait rien et restait à l'écran quand le
            flux se terminait sans son événement de fin — un curseur qui
            clignote sur une réponse achevée fait croire qu'elle continue. */}
      </div>
      {/* LA PIÈCE JOINTE RESTE DANS LE FIL.
          Sans elle, on relisait « analyse ça » sans savoir quoi — la question
          perdait son sujet dès qu'on remontait la conversation. */}
      {(message.pieces?.length || message.piece) && (
        <div className="mt-2 flex flex-wrap items-start gap-2">
          {(message.pieces?.length ? message.pieces : message.piece ? [message.piece] : []).map((piece, index) =>
            piece.apercu ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={`${piece.nom}-${index}`}
                src={piece.apercu}
                alt={piece.nom}
                className="h-24 w-24 rounded-xl border border-[var(--border)] object-cover"
                loading="lazy"
              />
            ) : (
              <div key={`${piece.nom}-${index}`} className="max-w-[20rem] rounded-xl border border-[var(--border)] px-3 py-2">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                  {piece.nom}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {[piece.type, piece.pages ? `${piece.pages} page${piece.pages > 1 ? "s" : ""}` : null, typeof piece.taille === "number" ? formatFileSize(piece.taille) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            )
          )}
        </div>
      )}
      {!message.streaming && message.toolConfirmation && (
        <ToolConfirmCard confirmation={message.toolConfirmation} />
      )}
      {message.blocks?.length ? (
        <RichResponseBlocks blocks={message.blocks} />
      ) : !message.streaming ? (
        <>
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className="mt-2">
              <MediaMessage images={imagesFromUrls(message.imageUrls, { alt: "Image générée par Toumaï AI" })} />
            </div>
          )}
          {message.searchImages && message.searchImages.length > 0 && (
            <div className="mt-2">
              <MediaMessage
                images={message.searchImages.map(
                  (img, i): ChatImage => ({
                    id: `${img.url}-${i}`,
                    url: img.url,
                    alt: img.title,
                    sourceUrl: img.source_url,
                    sourceTitle: img.title,
                  }),
                )}
              />
            </div>
          )}
          {message.sources && message.sources.length > 0 && <WebSourcesRow sources={message.sources} />}
        </>
      ) : null}
      {!message.streaming && message.modelNotice && (
        <p className="pt-1 text-[11px] text-[var(--text-tertiary)]">{message.modelNotice}</p>
      )}
      {!message.streaming && message.content && (
        <div
          className="msg-actions flex items-center gap-0.5 pt-2 text-[var(--text-tertiary)]"
          data-pinned={isLast}
        >
          <button
            onClick={copy}
            title="Copier"
            aria-label="Copier la réponse"
            className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          {message.serverId && (
            <>
              <button
                onClick={() => rate("up")}
                title="Bonne réponse"
                aria-label="Bonne réponse"
                aria-pressed={rated === "up"}
                disabled={!!rated}
                className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-100"
                style={
                  rated === "up"
                    ? { color: "var(--success)", background: "rgba(16,185,129,0.14)" }
                    : undefined
                }
              >
                <ThumbUpIcon filled={rated === "up"} />
              </button>
              <button
                onClick={() => rate("down")}
                title="Mauvaise réponse"
                aria-label="Mauvaise réponse"
                aria-pressed={rated === "down"}
                disabled={!!rated}
                className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-100"
                style={
                  rated === "down"
                    ? { color: "var(--error)", background: "rgba(239,68,68,0.14)" }
                    : undefined
                }
              >
                <ThumbDownIcon filled={rated === "down"} />
              </button>
              {rated && (
                <span className="animate-fade-in pl-1 text-xs text-[var(--text-tertiary)]">
                  Merci pour votre retour !
                </span>
              )}
            </>
          )}
          <button
            onClick={() => speech.speak(message.content)}
            title={speech.state === "idle" ? "Lire à voix haute" : "Arrêter la lecture"}
            aria-label={speech.state === "idle" ? "Lire la réponse à voix haute" : "Arrêter la lecture"}
            disabled={speech.state === "loading"}
            className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            style={speech.state === "playing" ? { color: "var(--primary)" } : undefined}
          >
            {speech.state === "loading" ? (
              <SpinnerIcon />
            ) : speech.state === "playing" ? (
              <SpeakerStopIcon />
            ) : (
              <SpeakerIcon />
            )}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              title="Régénérer"
              aria-label="Régénérer la réponse"
              className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <RegenerateIcon />
            </button>
          )}
          {speech.error && (
            <span className="pl-1 text-xs text-[var(--text-tertiary)]">{speech.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
