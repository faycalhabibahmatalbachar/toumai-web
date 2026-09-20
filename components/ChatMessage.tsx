"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendFeedback } from "@/lib/chat-api";
import type { ToolConfirmation, WebSource, SearchImage } from "@/lib/chat-stream";
import { CodeBlock } from "./CodeBlock";
import { SiteBuildingCard, SiteArtifactCard, extractHtml } from "./SiteBuilder";
import { ProjectCard } from "./ProjectViewer";
import { parseProject, hasPatches, parseSearchReplace, applyPatches } from "@/lib/project-parser";
import { MediaMessage, imagesFromUrls } from "./chat/media/MediaMessage";
import type { ChatImage } from "./chat/media/types";
import type { ResponseBlock } from "@/lib/chat-response";
import { activityLabel } from "@/lib/tool-ui";
import { RichResponseBlocks } from "./chat/RichResponseBlocks";
import { SourcesCard } from "./chat/widgets/kinds/ResearchWidgets";
import { InlineProgress } from "./chat/widgets/primitives";
import { TaskProgress, inferTaskActivity } from "./chat/TaskProgress";
import { ReasoningPanel } from "./chat/ReasoningPanel";
import { ActionExecutionCard } from "./chat/widgets/ActionExecutionCard";
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
  if (after.includes("```")) return null;
  return after;
}

function linkifySourceCitations(markdown: string, sources?: WebSource[]): string {
  if (!markdown || !sources?.length) return markdown;
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
  serverId?: string;
  envoyeLe?: string;
  imageUrls?: string[];
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
  /** Action sensible en attente. Le résultat affiché par la carte vient du
   * journal serveur et de la relecture du connecteur, jamais du texte du LLM. */
  toolConfirmation?: ToolConfirmation;
  sources?: WebSource[];
  searchImages?: SearchImage[];
  blocks?: ResponseBlock[];
  modelNotice?: string;
  reasoning?: string;
  reasoningMs?: number;
  activity?: string;
  /** UI live du connecteur WhatsApp. Aucun QR ni secret n’est persisté ici. */
  whatsappConnector?: { intent: WhatsAppChatIntent };
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
      <path d="M7 22V11M2 13v7a2 2 0 002 2h12.6a2 2 0 002-1.6l1.3-6.5a2 2 0 00-2-2.4H14V6a3 3 0 00-3-3l-4 8v9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M17 2v11M22 11V4a2 2 0 00-2-2H7.4a2 2 0 00-2 1.6l-1.3 6.5a2 2 0 002 2.4H10v5a3 3 0 003 3l4-8V2" strokeLinecap="round" strokeLinejoin="round" />
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M12 3a9 9 0 019 9" strokeLinecap="round" />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Toumaï AI réfléchit">
      {[0, 1, 2].map((index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-current opacity-40" style={{ animation: "typing-bounce 1.1s ease-in-out infinite", animationDelay: `${index * 0.15}s` }} />
      ))}
    </div>
  );
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
  prevContent?: string;
  onEdit?: (newContent: string) => void;
  editable?: boolean;
  onRegenerate?: () => void;
  onRetry?: () => void;
  onSuggest?: (text: string) => void;
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
            <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); saveEdit(); } else if (event.key === "Escape") { setEditing(false); } }} rows={Math.min(8, Math.max(2, draft.split("\n").length))} className="w-full resize-none rounded-2xl border border-[var(--primary)] bg-[var(--card)] px-4 py-3 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none" />
            <div className="flex items-center justify-end gap-2">
              <span title="Apporter des modifications crée une nouvelle branche dans la conversation." className="mr-auto cursor-help text-[11px] text-[var(--text-tertiary)]">Crée une nouvelle branche</span>
              <button onClick={() => setEditing(false)} className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]">Annuler</button>
              <button onClick={saveEdit} disabled={!draft.trim()} className="rounded-full px-3.5 py-1.5 text-xs font-medium text-white transition disabled:opacity-40" style={{ background: "var(--primary)" }}>Enregistrer</button>
            </div>
          </div>
        </div>
      );
    }

    const editMatch = message.content.length > 1500 && /```html\n[\s\S]*```/.test(message.content)
      ? message.content.replace(/```html\n[\s\S]*?```/g, "").trim()
      : null;
    return (
      <div className="msg-row msg-in flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[76%]">
          <div className="whitespace-pre-wrap rounded-[20px] rounded-br-[8px] px-4 py-2.5 text-[length:var(--chat-fs,15px)] leading-relaxed text-[var(--text-primary)]" style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--text-primary) 7%, transparent)" }}>
            {editMatch ?? message.content}
            {editMatch && <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]"><FileChipIcon /> Code du site joint pour modification</span>}
          </div>
          <div className="msg-actions flex items-center gap-0.5">
            <button onClick={copy} aria-label={copied ? "Copié" : "Copier le message"} title={copied ? "Copié" : "Copier"} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]">{copied ? <CheckIcon /> : <CopyIcon />}</button>
            {editable && onEdit && <button onClick={startEdit} aria-label="Modifier le message" title="Modifier" className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"><EditIcon /></button>}
            {editable && onRetry && <button onClick={onRetry} aria-label="Renvoyer ce message" title="Renvoyer" className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"><RegenerateIcon /></button>}
          </div>
        </div>
      </div>
    );
  }

  const pendingCode = message.streaming ? pendingHtmlCode(message.content || "") : null;
  const building = pendingCode !== null;
  const patchedHtml = (() => {
    if (message.streaming || !hasPatches(message.content || "")) return null;
    const base = baseHtmlFrom(prevContent);
    if (!base) return null;
    const { html, applied } = applyPatches(base, parseSearchReplace(message.content || ""));
    return applied > 0 ? html : null;
  })();
  const project = !message.streaming && !patchedHtml ? parseProject(message.content || "") : [];
  const isProject = project.length >= 2;
  const finishedHtml = patchedHtml ?? (!isProject && !message.streaming ? extractHtml(message.content || "") : null);
  const isSite = Boolean(finishedHtml);
  const searchImageUrls = new Set((message.searchImages ?? []).map((image) => image.url));
  const standaloneImageUrls = (message.imageUrls ?? []).filter((url) => !searchImageUrls.has(url));
  const inferredTaskActivity = message.streaming && !message.content ? inferTaskActivity(prevContent) : null;

  let visibleContent = message.content || "";
  if (building) visibleContent = visibleContent.replace(/```html[\s\S]*$/i, "").trimEnd();
  if (patchedHtml) visibleContent = "✅ Modifications appliquées à votre site.";
  if (isProject || isSite) visibleContent = visibleContent.replace(/```[^\n`]*\n[\s\S]*?```/g, "").trim();

  return (
    <div className="msg-row msg-in">
      <div className="mb-2 flex items-center gap-2">
        <Logo size={18} className="rounded-[5px]" />
        <span className={`text-[12px] tracking-[0.01em] ${message.streaming ? "chat-thinking" : "text-[var(--text-tertiary)]"}`}>Toumaï AI</span>
      </div>
      {message.reasoning && <ReasoningPanel reasoning={message.reasoning} durationMs={message.reasoningMs} streaming={message.streaming} />}
      {message.whatsappConnector && <WhatsAppConnectorCard intent={message.whatsappConnector.intent} />}
      <div className="text-[length:var(--chat-fs,15px)] leading-relaxed">
        {message.streaming && message.activity ? (
          message.activity.startsWith("whatsapp") && inferredTaskActivity ? (
            <TaskProgress {...inferredTaskActivity} label={activityLabel(message.activity) || inferredTaskActivity.label} />
          ) : (
            <InlineProgress label={activityLabel(message.activity)} />
          )
        ) : null}
        {message.streaming && !message.content ? (
          message.activity ? null : inferredTaskActivity ? <TaskProgress {...inferredTaskActivity} /> : <TypingDots />
        ) : (
          <div className="prose-toumai">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre(props) { return <>{props.children}</>; },
                code(props) {
                  const { className, children } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  const isBlock = Boolean(match);
                  const codeText = children === undefined || children === null ? "" : String(children).replace(/\n$/, "");
                  if (!isBlock) return <code className={className}>{children}</code>;
                  if (!codeText.trim()) return null;
                  return <CodeBlock language={match![1]} code={codeText} />;
                },
                img(props) {
                  const src = typeof props.src === "string" ? props.src : "";
                  if (!src) return null;
                  return <MediaMessage images={[{ id: src, url: src, alt: props.alt || undefined }]} />;
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
      </div>

      {(message.pieces?.length || message.piece) && (
        <div className="mt-2 flex flex-wrap items-start gap-2">
          {(message.pieces?.length ? message.pieces : message.piece ? [message.piece] : []).map((piece, index) => piece.apercu ? (
            <img key={`${piece.nom}-${index}`} src={piece.apercu} alt={piece.nom} className="h-24 w-24 rounded-xl border border-[var(--border)] object-cover" loading="lazy" />
          ) : (
            <div key={`${piece.nom}-${index}`} className="max-w-[20rem] rounded-xl border border-[var(--border)] px-3 py-2">
              <p className="truncate text-xs font-medium text-[var(--text-primary)]">{piece.nom}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{[piece.type, piece.pages ? `${piece.pages} page${piece.pages > 1 ? "s" : ""}` : null, typeof piece.taille === "number" ? formatFileSize(piece.taille) : null].filter(Boolean).join(" · ")}</p>
            </div>
          ))}
        </div>
      )}

      {!message.streaming && message.toolConfirmation && <ActionExecutionCard confirmation={message.toolConfirmation} />}
      {message.blocks?.length ? (
        <RichResponseBlocks blocks={message.blocks} hideConfirmation={Boolean(message.toolConfirmation)} streaming={Boolean(message.streaming)} />
      ) : !message.streaming ? (
        <>
          {standaloneImageUrls.length > 0 && <div className="mt-2"><MediaMessage images={imagesFromUrls(standaloneImageUrls, { alt: "Image générée par Toumaï AI" })} /></div>}
          {message.searchImages && message.searchImages.length > 0 && (
            <div className="mt-2"><MediaMessage images={message.searchImages.map((image, index): ChatImage => ({ id: `${image.url}-${index}`, url: image.url, alt: image.title, sourceUrl: image.source_url, sourceTitle: image.title }))} /></div>
          )}
          {message.sources && message.sources.length > 0 && <SourcesCard sources={message.sources} />}
        </>
      ) : null}
      {!message.streaming && message.modelNotice && <p className="pt-1 text-[11px] text-[var(--text-tertiary)]">{message.modelNotice}</p>}
      {!message.streaming && message.content && (
        <div className="msg-actions flex items-center gap-0.5 pt-2 text-[var(--text-tertiary)]" data-pinned={isLast}>
          <button onClick={copy} title="Copier" aria-label="Copier la réponse" className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]">{copied ? <CheckIcon /> : <CopyIcon />}</button>
          {message.serverId && (
            <>
              <button onClick={() => rate("up")} title="Bonne réponse" aria-label="Bonne réponse" aria-pressed={rated === "up"} disabled={!!rated} className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-100" style={rated === "up" ? { color: "var(--success)", background: "rgba(16,185,129,0.14)" } : undefined}><ThumbUpIcon filled={rated === "up"} /></button>
              <button onClick={() => rate("down")} title="Mauvaise réponse" aria-label="Mauvaise réponse" aria-pressed={rated === "down"} disabled={!!rated} className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-100" style={rated === "down" ? { color: "var(--error)", background: "rgba(239,68,68,0.14)" } : undefined}><ThumbDownIcon filled={rated === "down"} /></button>
              {rated && <span className="animate-fade-in pl-1 text-xs text-[var(--text-tertiary)]">Merci pour votre retour !</span>}
            </>
          )}
          <button onClick={() => speech.speak(message.content)} title={speech.state === "idle" ? "Lire à voix haute" : "Arrêter la lecture"} aria-label={speech.state === "idle" ? "Lire la réponse à voix haute" : "Arrêter la lecture"} className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]" style={speech.state === "playing" ? { color: "var(--primary)" } : undefined}>{speech.state === "loading" ? <SpinnerIcon /> : speech.state === "playing" ? <SpeakerStopIcon /> : <SpeakerIcon />}</button>
          {onRegenerate && <button onClick={onRegenerate} title="Régénérer" aria-label="Régénérer la réponse" className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"><RegenerateIcon /></button>}
          {speech.error && <span className="pl-1 text-xs text-[var(--text-tertiary)]">{speech.error}</span>}
        </div>
      )}
    </div>
  );
}
